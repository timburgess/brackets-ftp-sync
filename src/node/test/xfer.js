/*
 * Copyright (c) 2013-2014 Tim Burgess. All rights reserved.
 *  
 * @author Tim Burgess <info@tim-burgess.com>
 * @license Tim Burgess 2014
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true, white: true, evil: true */
/*globals HOST:true,PORT:true,USER:true,PWD:true,LOCALROOT:true,REMOTEROOT:true,ftp:true,emit:true,_domainManager:true,connect*/

(function () {
  
  var assert = require("assert"),
      fs     = require("fs"),
      util   = require("util"),
      events = require("events");
//      rimraf = require("rimraf");
  
  var sftp;
  var opts = {
    host: 'tsunami',
    port: 22,
    username: 'tim',
    pwd:  'xxx',
    privateKey: fs.readFileSync('/home/tim/.ssh/id_rsa'),
    passphrase: 'nishidaikoku1'
//    debug: console.log
  };
  
  var Connection = require('ssh2');
  
  var c = new Connection();
  
  c.on('ready', function() {
    console.log('connected via ssh2');
    // create sftp
    c.sftp(function(err, sftp_ref) {
      if (err) throw err;
      sftp = sftp_ref;
      console.log('created sftp');
      sftp.stat('ftptest/public_html/index.html', function(err, stats) {
        if (err) {
          if (err.toString().indexOf('No such file') !== -1) {
            // does not exist remotely so push up
            sftp.fastPut('./testdata/test1/index.html', 'ftptest/public_html/index.html', function(err) {
              if (err) throw err;
              console.log('fastPut complete');

              c.end();
            });
          }
        } else {
          console.log('file already exists');
          c.end();
        }
      });
    });
  });
  
  c.on('error', function(err) {
    console.log('Connection error ' + err);
  });
  
  c.on('end', function() {
    console.log('Connection end');
  });
  
  c.on('close', function() {
    console.log('Connection close');
  });
  
  c.connect(opts);
  
  
}());