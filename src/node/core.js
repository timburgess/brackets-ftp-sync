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
     FTP = require("./FTP.js");

  var _domainManager;

  var LOCALROOT, REMOTEROOT;

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
    } else if (err.code === 'ECONNRESET') {
        _domainManager.emitEvent("ftpsync", "error", "Connect to host reset");
    } else if (err.code === 'ECONNREFUSED') {
        _domainManager.emitEvent("ftpsync", "error", "Connection to host refused");
    } else {
        
      console.log('Conn error: ' + err.message);
      _domainManager.emitEvent('ftpsync', 'error', 'Error: ' + err.message);
    }
  });
  
  function halt() {
    haltCalled = true;
    console.log('halt called');
  }

  
  function final(emitOK) {
    if (emitOK === undefined) { emitOK = true; }
    ftp.disconnect();
    if (emitOK) { _domainManager.emitEvent("ftpsync", "disconnected"); }
    console.log('disconnected');
    // reset flags
    processOps = false;
    haltCalled = false;
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
    _domainManager.emitEvent('ftpsync', 'chkdir', 'checking ' + remotePath);
    ftp.mkdir(remotePath, function(err, exists) {
      if (err) throw err;
      if (!exists) {
        _domainManager.emitEvent("ftpsync", "mkdir", "created " + remotePath);
        console.log('created remote dir ' + remotePath);
      }
      return series(ops.shift());
    });
  }

  // push up a copy of local file
  function putOp(localPath, remotePath) {
    ftp.put(localPath, remotePath, function(err) {
      if (err) throw err;
      _domainManager.emitEvent("ftpsync", "uploaded", "uploaded " + remotePath);
      console.log('uploaded ' + remotePath);
      return series(ops.shift());
    });
  }

  // stat remote file. add dirOp or pushOp if required
  function statOp(localPath, remotePath) {
    console.log('stating ' + remotePath);
    ftp.exists(localPath, remotePath, function(exists) {
      if (!exists) {
        ops.push([putOp, localPath, remotePath]);
      }
      return series(ops.shift());
    });
  }


  // checks the remote directory exists, and if so, walk it
  function checkRemoteDir(exists) {
    
    if (!exists) {
        _domainManager.emitEvent("ftpsync", "error", "Error: remote directory " + REMOTEROOT + " does not exist");
        console.log('cannot cwd remote root: ' + REMOTEROOT);
        // we've authed so we need to disconnect
        final(false);
        return;
    }

    // setup walk function
    var walkFileSystem = function (pathSuffix) {
        var i;
        var fullPath = LOCALROOT + pathSuffix;

        var files = fs.readdirSync(fullPath);
        for (i in files) {
            // ignore hiddenfiles
            if (files[i].substring(0, 1) !== '.') {

                var currentFile = fullPath + files[i];
                var remotePath = REMOTEROOT + pathSuffix + files[i];
                var stats = fs.statSync(currentFile);

                if (stats.isFile()) {
                    ops.push([statOp, currentFile, remotePath]);
                    // start ops now we have an op
                    if (!processOps) {
                        processOps = true;
                        series(ops.shift());
                    }

                } else if (stats.isDirectory()) {
                    ops.push([dirOp, currentFile, remotePath]);
                    walkFileSystem(pathSuffix + files[i] + '/');
                } // ignore other types
            }
        }
    };
    
    walkFileSystem('/');
  }


  function connect(opts, localRoot, domainManager) {

    LOCALROOT = localRoot;
    REMOTEROOT = typeof opts.remoteRoot === 'undefined' ? '.' : opts.remoteRoot || '.';
    _domainManager = domainManager;
    
    domain.enter();

    // check that local dir exists, walk local fs
    fs.exists(LOCALROOT, function (exists) {
      if (!exists) { 
        _domainManager.emitEvent("ftpsync", "error", LOCALROOT + ' does not exist');
        console.log('local directory ' + LOCALROOT + ' does not exist');
        return;
      }
      
      ftp = new FTP(_domainManager);

      // connect to remote
      ftp.connect(opts, function(connected) {
        // if an error occurs, callback may not run
        if (!connected) return;
        ftp.stat(REMOTEROOT, checkRemoteDir);
      });
      
    });

    domain.exit();
  }
  
  exports.connect = connect;
  exports.halt = halt;
  
}());

