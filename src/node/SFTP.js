/*
 * Copyright (c) 2014 Tim Burgess. All rights reserved.
 *  
 * @author Tim Burgess <info@tim-burgess.com>
 * @license Tim Burgess 2014
 */
/*jslint debug:true, vars: true, plusplus: true, devel: true, nomen: true, indent: 2,
maxerr: 50, node: true, white: true */

var fs = require('fs');

function SFTP(domainManager) {
  
  var Connection = require('ssh2');

  this._domainManager = domainManager;
  this.c = new Connection();
  
  this.c.on('end', function() {
    console.log('connection end');
  });
  
  this.c.on('close', function() {
    console.log('connection close');
  });

}

SFTP.prototype.connect = function(opts, cb) {

  if (opts.privateKeyFile) {
    if (!fs.existsSync(opts.privateKeyFile)) {
      errmsg = 'Key file ' + opts.privateKeyFile + ' does not exist';
      console.log(errmsg);
      this._domainManager.emitEvent('ftpsync', 'error', errmsg);
      return cb(false);
    }
    opts.privateKey = fs.readFileSync(opts.privateKeyFile);
    opts.passphrase = opts.pwd;
    console.log('using key authentication');
  } else {
    opts.password = opts.pwd;
    console.log('using password authentication');
  }
    
  // tweak opts for ssh2
  opts.username = opts.user;

  
  var self = this;
  this.c.on('ready', function() {
    // emit connected event
    self._domainManager.emitEvent("ftpsync", "connected");
    console.log('connected via ssh');
    // create sftp
    self.c.sftp(function(err, sftp) {
      // make scoped reference
      if (err) {
        //log error
        cb(false);
      }
      console.log('using sftp');
      self.sftp = sftp;
      cb(true);
    });
  });

  this.c.on('error', function(err) {
    // bad passwords will end up here
    console.log('ssh connection error: ' + err.message);
    if (err.code === 'ECONNREFUSED')
      err.message = "Host refused connection request";
    self._domainManager.emitEvent('ftpsync', 'error', err.message);
  });
  
  this.c.connect(opts);
};  
  

SFTP.prototype.disconnect = function() {
  this.c.end();
};

SFTP.prototype.stat = function(remotePath, cb) {
  // stat whether same size file exists or not
  this.sftp.stat(remotePath, function(err, stats) {
    if (err) {
      if (err.toString().indexOf('No such file') !== -1) {
        return cb(false); // as doesn't exist
      } else {
        throw err;
      }
    } else {
      return cb(true);
    }
  });
};

SFTP.prototype.exists = function(localPath, remotePath, cb) {
  // stat whether same size file exists or not
  this.sftp.stat(remotePath, function(err, stats) {
    if (err) {
      if (err.toString().indexOf('No such file') !== -1) {
        return cb(false); // as doesn't exist
      } else {
        throw err;
      }
    } else {
      if (stats.size > 0) {
          // found remote file with same name
          // if filesize not the same, push up local
          var size = fs.statSync(localPath).size;
          if (size !== stats.size) {
            return cb(false);
          } else {
            return cb(true);
          }
      } else {
        // no remote file add push op
        return cb(false);
      }
    }
  });
};

SFTP.prototype.put = function(localPath, remotePath, cb) {
  this.sftp.fastPut(localPath, remotePath, function(err) {
    cb(err);
  });
};

SFTP.prototype.mkdir = function(remotePath, cb) {
  this.sftp.mkdir(remotePath, function(err) {
    if (err && err.toString().indexOf('Error: Failure') === 0) // ignore already existing dir
        return cb(undefined, true);
    cb(err, false);
  });
};

module.exports = SFTP;
  
