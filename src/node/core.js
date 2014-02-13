/*
 * Copyright (c) 2013-2014 Tim Burgess. All rights reserved.
 *  
 * @author Tim Burgess <info@tim-burgess.com>
 * @license Tim Burgess 2014
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true, white: true */
/* global */


// ftp-sync node code

(function () {
  //"use strict";
  
  var fs = require("fs"),
  domain = require("domain").create(),
   JSFtp = require("jsftp");

  var _domainManager;

  var LOCALROOT;
  var REMOTEROOT;

  var ftp;
  var processOps = false;
  var haltCalled = false;
  var ops = [];
  
  // constructor
  var self = exports;

  // domain to catch any exceptions e.g. timeout
  domain.on('error', function (err) {
    if (err.code === 'ENOTFOUND') {
        _domainManager.emitEvent("ftpsync", "error", "Host not found");
    } else if (err.code === 'ETIMEDOUT') {
        _domainManager.emitEvent("ftpsync", "error", "Connect to host timed out");
    }
    console.log(err);
  });
  
  function halt() {
    haltCalled = true;
    console.log('halt called');
  }

  
  function final(emitOK) {
    if (emitOK === undefined) { emitOK = true; }
    ftp.raw.quit(function (err, data) {
      if (emitOK) {
          _domainManager.emitEvent("ftpsync", "disconnected", data.text);
      }
      console.log('quit:' + data.text);
      // reset flags
      processOps = false;
      haltCalled = false;
    });
  }

  // control-flow
  function series(op) {

      if (op) {
          if (haltCalled) {
              ops = [];
              return final();
          }
          var func = op[0];
          func(op[1], op[2]);
      } else {
          return final();
      }
  }

  // make a remote dir
  function dirOp(localPath, remotePath) {
    console.log('mkdir ' + remotePath);
    ftp.raw.mkd(remotePath, function (err) {
        if (err) {
            if (err.code !== 550) {
                console.log('remote mkdir failed:' + err);
            }
        } else {
            _domainManager.emitEvent("ftpsync", "mkdir", "created " + remotePath);
            console.log('created remote dir ' + remotePath); }
        return series(ops.shift());
    });
  }

  // push up a copy of local file
  function putOp(localPath, remotePath) {
    //console.log(localPath + '->' + remotePath);
    var readStream = fs.createReadStream(localPath);
    ftp.put(readStream, remotePath, function(err) {
        if (err) {
            console.log('upload error:' + err);
        }
        _domainManager.emitEvent("ftpsync", "uploaded", "uploaded " + remotePath);
        console.log('uploaded ' + remotePath);
        return series(ops.shift());
    });
  }

  // stat remote file. add dirOp or pushOp if required
  function statOp(localPath, remotePath) {
    console.log('stating ' + remotePath);
    ftp.ls(remotePath, function (err, res) {
      if (err) {
          console.log('cannot stat remote file:' + err);
      } else {
          if (res.length > 0) {
              // found remote file with same name
              // if filesize not the same, push up local
              var size = fs.statSync(localPath).size;
              if (size !== parseInt(res[0].size,10)) {
                  ops.push([putOp, localPath, remotePath]);
              }
          } else {
              // no remote file add push op
              ops.push([putOp, localPath, remotePath]);
          }
      }
      return series(ops.shift());
    });
  }


  // checks the return from a cwd that we have a valid remote root and
  // then initiates directory walk
  function checkRemoteDir(err, data) {
    if (err) {
        _domainManager.emitEvent("ftpsync", "error", "Error: remote directory " + REMOTEROOT + " does not exist");
        console.log('cannot cwd remote root: ' + REMOTEROOT);
        // we've authed so we need to disconnect
        final(false);
        return;
    }

    // get the login dir and prefix to REMOTEPATH
    ftp.raw.pwd(function (err, data) {
        if (err) {
            // we've authed so we need to disconnect
            _domainManager.emitEvent("ftpsync", "error", "Error: " + data.text);
            final(false);
            return;
        }

        console.log(data.text);

        var raw = data.text.split(' ')[1];
        // strip out quotes in path
        var prefix = raw.replace(/\"/g, "");
//        if (prefix[prefix.length-1] !== '/') prefix += '/';
        console.log('cwd to ' + prefix);
        REMOTEPATH = prefix;

        // setup walk function
        var walkFileSystem = function (pathSuffix) {
            var i;
            var fullPath = LOCALROOT + pathSuffix;

            var files = fs.readdirSync(fullPath);
            for (i in files) {
                // ignore hiddenfiles
                if (files[i].substring(0, 1) !== '.') {

                    var currentFile = fullPath + files[i];
                    var remotePath = REMOTEPATH + pathSuffix + files[i];
                    var stats = fs.statSync(currentFile);

                    if (stats.isFile()) {
                        //console.log('pushing file:' + remotePath);
                        ops.push([statOp, currentFile, remotePath]);
                        // start ops now we have an op
                        if (!processOps) {
                            processOps = true;
                            series(ops.shift());
                        }

                    } else if (stats.isDirectory()) {
                        //console.log('pushing dir:' + remotePath);
                        ops.push([dirOp, currentFile, remotePath]);
                        walkFileSystem(pathSuffix + files[i] + '/');
                    } // ignore other types
                }
            }
        };
        walkFileSystem('/');
    });
  }
        
  function connect(host, port, user, pwd, localroot, remoteroot, domainManager) {

    LOCALROOT = localroot;
    REMOTEROOT = typeof remoteroot === 'undefined' ? '.' : remoteroot || '.';
    _domainManager = domainManager;
    
    domain.enter();

    // check that local dir exists, walk local fs
    fs.exists(LOCALROOT, function (exists) {
      if (!exists) { 
          _domainManager.emitEvent("ftpsync", "error", LOCALROOT + ' does not exist');
          console.log('local directory ' + LOCALROOT + ' does not exist');
          return;
      }
      
      ftp = new JSFtp({
          host: host
      });
      

      // connect to remote
      ftp.auth(user, pwd, function (err, data) {
          if (err) { 
              _domainManager.emitEvent("ftpsync", "error", err.toString());
              console.log('Failed to connect to remote: ' + err);
              return;
          }

          // emit connect
          _domainManager.emitEvent("ftpsync", "connected", data.text);
          console.log('Connected ' + data.text);

          // check REMOTEROOT is a valid directory
          ftp.raw.cwd(REMOTEROOT, checkRemoteDir);
      });
    });

    domain.exit();
  }
  
  exports.connect = connect;
  exports.halt = halt;
  
}());

