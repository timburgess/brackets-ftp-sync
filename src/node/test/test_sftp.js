/*
 * Copyright (c) 2013-2014 Tim Burgess. All rights reserved.
 *  
 * @author Tim Burgess <info@tim-burgess.com>
 * @license Tim Burgess 2014
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true, white: true, evil: true */
/*globals HOST:true,PORT:true,USER:true,PWD:true,LOCALROOT:true,REMOTEROOT:true,ftp:true,emit:true,_domainManager:true,connect*/

  
  var assert = require("assert"),
      fs     = require("fs"),
      util   = require("util"),
      events = require("events"),
      Connection = require("ssh2");
  
  
  function MockDomainManager() {
    this._eventCount = 0;
  }
  util.inherits(MockDomainManager, events.EventEmitter);


  MockDomainManager.prototype.emitEvent = function(domainName, eventName, parameters) {
    if (parameters)
      console.log("[%s] %s", eventName, parameters);
    else
      console.log("[%s]", eventName);
    // we need to emit events for test completion checking but
    // emitting an error will cause it to be rethrown so we
    // avoid if an error
    if (eventName !== 'error')
      this.emit(eventName);
    ++this._eventCount;
  };

  // load default settings
  var defaultConfig = require('./config.sftp.json');
  
  // load node-side
  var ftpsync = require("../core.js");
  
  // mock domainmanager for event capture
  var _domainManager = new MockDomainManager();

  
  // directory where ftp server puts you at login
  var LOCALPREFIX = config.localprefix;
  
  // where the remote root directory is located locally
  // A directory named ftptest will be created here for testing 
  var LOCALPATH;

  var PRIVATEKEYFILE = '/Users/tim/.ssh/id_rsa';

  // override config with options and
  // return an opts object for ssh2
  function config(options) {
    var opts = {
      connect: 'SFTP',
      host: defaultConfig.host,
      port: 22,
      user: defaultConfig.user,
      pwd:  defaultConfig.pwd
      //    debug: console.log
    }
    if (options) {
      // TODO - better way to iterate thru properties
      if (options.host) opts.host = options.host;
      if (options.remoteRoot) opts.remoteRoot = options.remoteRoot;
      if (options.username) opts.username = options.username;
      if (options.password) opts.password = options.password;
      if (options.pwd) opts.pwd = options.pwd;
      if (options.privateKeyFile) opts.privateKeyFile = options.privateKeyFile;
    }
      
    return opts;
  };
 

  // accept an array of pathnames and sizes
  // and confirm sizes of remote paths
  function statSize(remotePaths, callback) {
    var c = new Connection();
    c.on('ready', function() {
      c.sftp(function(err, sftp) {
        for (var i=0; i < remotePaths.length; ++i) {
          (function(i) {
            sftp.stat(remotePaths[i][0], function(err, stats) {
              assert.equal(remotePaths[i][1], stats.size,
                 '** '+remotePaths[i][0]+' is not size '+remotePaths[i][1]+', it is '+stats.size+' **');
              // disconnect if final path check
              if (i === remotePaths.length-1) {
                c.end();
                callback();
              }
            });
          })(i);
        }
      });
    });
    c.connect(opts);
  }

  // execute command remotely
  function exec(command, callback) {
    
    var c = new Connection();
    c.on('ready', function() {
      c.exec(command, function(err, stream) {
        if (err) throw err;
        stream.on('exit', function(code, signal) {
          c.end();
          callback();
        });
      });
    });
    
    // no SFTP so pass ssh2 opts
    var opts = config({ username: 'tim',
                        password: 'nishidaikoku' });
    c.connect(opts);
  }

  
  // before each test, rm -rf ftptest
//  describe('FTP-Sync', function() {
//    
//    beforeEach(function(done) {
//      this.timeout(0);
//      exec('rm -rf ftptest', function() {
//        console.log('deleted remote ftptest dir');
//        done();
//      });
//    });

//    describe('SFTP test:', function() {
//      
//      // test password authentication
//      it('password auth', function(done) {
//
//        this.timeout(0);
//        opts = config({ pwd: "nishidaikoku",
//                        remoteRoot: "ftptest/public_html" });
//        localRoot = "./testdata/test1";
//
//        exec('mkdir -p ' + opts.remoteRoot, function() {
//          console.log('created remoteroot');
//
//          ftpsync.connect(opts, localRoot, _domainManager);
//          // wait for disconnect and then assert files exist
//          _domainManager.once('disconnected', function() {
//            done();
//          });
//        });
//      });

      // test key authentication
//      it('key auth', function(done) {
//
//        this.timeout(0);
//        opts = config({ pwd: "nishidaikoku1",
//                        privateKeyFile: PRIVATEKEYFILE,
//                        remoteRoot: "ftptest/public_html" });
//        localRoot = "./testdata/test1";
//
//        exec('mkdir -p ' + opts.remoteRoot, function() {
//          console.log('created remoteroot');
//
//          ftpsync.connect(opts, localRoot, _domainManager);
//          // wait for disconnect and then assert files exist
//          _domainManager.once('disconnected', function() {
//            done();
//          });
//        });
//      });



      // test bad keyfile passphrase
//      it('bad password', function(done) {

//        this.timeout(0);
//        opts = config({ pwd: "badpwd",
//                        remoteRoot: "ftptest/public_html" });
//        localRoot = "./testdata/test1";
//
//        ftpsync.connect(opts, localRoot, _domainManager);
        
//        _domainManager.once('error', function() {
//          done();
//        });
//      });

//    });

        opts = config({ host: "localhost",
                        pwd: "puddlejump",
                        remoteRoot: "ftptest/public_html" });
        localRoot = "./testdata/test1";

        ftpsync.connect(opts, localRoot, _domainManager);

    
//      // test file changes
//      it('sync file changes', function(done) {
//        
//        this.timeout(0);
//        opts.localRoot = "./testdata/test1";
//        opts.remoteRoot = "ftptest/public_html";
//
//        // create remote public_html dir
//        exec('mkdir -p ' + opts.remoteRoot, function() {
//          console.log('created remoteroot');
//
//          ftpsync.connect(opts, _domainManager);
//  
//          // wait for disconnect and then assert files exist
//          _domainManager.once('disconnected', function() {
//            // assert remote file states
//            var remotePaths = [[opts.remoteRoot + '/bin.py', 220],
//                               [opts.remoteRoot + '/index.html', 136],    
//                               [opts.remoteRoot + '/re.py', 444]];    
//              
//            statSize(remotePaths, function() {
//              opts.localRoot = "./testdata/test1A";
//              ftpsync.connect(opts, _domainManager);
//    
//              _domainManager.once('disconnected', function() {
//    
//                var remotePaths = [[opts.remoteRoot + '/bin.py', 220],
//                                   [opts.remoteRoot + '/foo.html', 72],    
//                                   [opts.remoteRoot + '/index.html', 165],    
//                                   [opts.remoteRoot + '/re.py', 444]];    
//  
//                // assert remote file state
//                statSize(remotePaths, function() { done(); });
//              });
//            });
//          });
//        });
//      });
//
//      // test dir and file changes
//      it('sync dir and file changes', function(done) {
//        opts.localRoot = "./testdata/test2";
//        opts.remoteRoot = "ftptest/public_html";
//
//        // create public_html dir
//        exec('mkdir -p ' + opts.remoteRoot, function() {
//
//          ftpsync.connect(opts, _domainManager);
//  
//          // wait for disconnect and then assert files exist
//          _domainManager.once('disconnected', function() {
//
//            var remotePaths = [[opts.remoteRoot + '/bin.py', 220],
//                               [opts.remoteRoot + '/index.html', 136],    
//                               [opts.remoteRoot + '/code/re.py', 444]];    
//            
//            // assert file state
//            statSize(remotePaths, function() { done(); });
//          });
//        });
//      });
//
//      // test sync to root
//      it('sync directory structure to ftp root', function(done) {
//        opts.localRoot = "./testdata/test3";
//        opts.remoteRoot = ".";
//
//        ftpsync.connect(opts, _domainManager);
//
//        // wait for disconnect and then assert files exist
//        _domainManager.once('disconnected', function() {
//
//          var remotePaths = [['ftptest/application/cache/index.html', 136],
//                             ['ftptest/application/views/generix/bogus.php', 444],    
//                             ['ftptest/application/views/generix/some_long_filename.php', 220]];    
//            
//          // assert file state
//          statSize(remotePaths, function() { done(); });
//
//          // TODO - check for presence of subdirs
////          stats = fs.statSync(LOCALPATH + '/ftptest/application/cache');
////          assert(stats.isDirectory);
////          stats = fs.statSync(LOCALPATH + '/ftptest/application/views');
////          assert(stats.isDirectory);
////          stats = fs.statSync(LOCALPATH + '/ftptest/application/views/generix');
////          assert(stats.isDirectory);
//        });
//      });
//
//      // test to remote root empty string
//      it('sync directory structure to empty string root', function(done) {
//        opts.localRoot = "./testdata/test3";
//        opts.remoteRoot = "";
//
//        ftpsync.connect(opts, _domainManager);
//
//        // wait for disconnect and then assert files exist
//        _domainManager.once('disconnected', function() {
//
//          var remotePaths = [['ftptest/application/cache/index.html', 136],
//                             ['ftptest/application/views/generix/bogus.php', 444],    
//                             ['ftptest/application/views/generix/some_long_filename.php', 220]];    
//            
//          // assert file state
//          statSize(remotePaths, function() { done(); });
//
//          // TODO - check for presence of subdirs
//        });
//      });
//
//      // test to remoteroot as null
//      it('sync directory structure to null remoteroot', function(done) {
//        opts.localRoot = "./testdata/test3";
//        opts.remoteRoot = null;
//
//        ftpsync.connect(opts, _domainManager);
//
//        // wait for disconnect and then assert files exist
//        _domainManager.once('disconnected', function() {
//
//          var remotePaths = [['ftptest/application/cache/index.html', 136],
//                             ['ftptest/application/views/generix/bogus.php', 444],    
//                             ['ftptest/application/views/generix/some_long_filename.php', 220]];    
//            
//          // assert file state
//          statSize(remotePaths, function() { done(); });
//
//          // TODO - check for presence of subdirs
//        });
//      });
//
//      // test to remoteroot as undefined
//      it('sync directory structure to undefined remoteroot', function(done) {
//        opts.localRoot = "./testdata/test3";
//        opts.remoteRoot = undefined;
//
//        ftpsync.connect(opts, _domainManager);
//
//        // wait for disconnect and then assert files exist
//        _domainManager.once('disconnected', function() {
//
//          var remotePaths = [['ftptest/application/cache/index.html', 136],
//                             ['ftptest/application/views/generix/bogus.php', 444],    
//                             ['ftptest/application/views/generix/some_long_filename.php', 220]];    
//            
//          // assert file state
//          statSize(remotePaths, function() { done(); });
//
//          // TODO - check for presence of subdirs
//        });
//      });

//    });
//  });
