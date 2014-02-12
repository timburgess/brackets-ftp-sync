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
      events = require("events"),
      rimraf = require("rimraf");
  
  
  function MockDomainManager() {
    this._eventCount = 0;
  }
  util.inherits(MockDomainManager, events.EventEmitter);


  MockDomainManager.prototype.emitEvent = function(domainName, eventName, parameters) {
    console.log("[%s] %s", eventName, parameters);
//    if (eventName === 'error') {
      this.emit(eventName);
//    }
    ++this._eventCount;
  };

  // load ftp settings
  var config = require('./config.json');
  
  // load node-side
  var ftpsync = require("./core.js");
  
  // mock domainmanager for event capture
  var _domainManager = new MockDomainManager();
  
  PORT = 21;
  HOST = "localhost";
  USER = config.user;
  PWD = config.pwd;
  // directory where ftp server puts you at login
  var LOCALPREFIX = config.localprefix;
  
  // where the remote root directory is located locally
  // A directory named ftptest will be created here for testing 
  var LOCALPATH;

  describe('test1A:', function() {
    
    it('sync file changes', function(done) {
      LOCALROOT = "./testdata/test1";
      REMOTEROOT = "ftptest/public_html";
      LOCALPATH = LOCALPREFIX + '/' + REMOTEROOT;

      // empty remoteroot
      rimraf.sync(LOCALPATH);
      fs.mkdirSync(LOCALPATH);

      ftpsync.connect(HOST, PORT, USER, PWD, LOCALROOT, REMOTEROOT, _domainManager);

      // wait for disconnect and then assert files exist
      _domainManager.once('disconnected', function() {

        // assert file state
        stats = fs.statSync(LOCALPATH + '/bin.py');
        assert.equal(stats.size, 220);
        stats = fs.statSync(LOCALPATH + '/index.html');
        assert.equal(stats.size, 136);
        stats = fs.statSync(LOCALPATH + '/re.py');
        assert.equal(stats.size, 444);

        LOCALROOT = "./testdata/test1A";
        ftpsync.connect(HOST, PORT, USER, PWD, LOCALROOT, REMOTEROOT, _domainManager);
        
        _domainManager.once('disconnected', function() {

          // assert file state
          stats = fs.statSync(LOCALPATH + '/bin.py');
          assert.equal(stats.size, 220);
          stats = fs.statSync(LOCALPATH + '/foo.html');
          assert.equal(stats.size, 72);
          stats = fs.statSync(LOCALPATH + '/index.html');
          assert.equal(stats.size, 165);
          stats = fs.statSync(LOCALPATH + '/re.py');
          assert.equal(stats.size, 444);
          done();
        });
      });
    });

    
    it('sync dir and file changes', function(done) {
      LOCALROOT = "./testdata/test2";
      REMOTEROOT = "ftptest/public_html";
      LOCALPATH = LOCALPREFIX + '/' + REMOTEROOT;

      // empty remoteroot
      rimraf.sync(LOCALPATH);
      fs.mkdirSync(LOCALPATH);

      ftpsync.connect(HOST, PORT, USER, PWD, LOCALROOT, REMOTEROOT, _domainManager);

      // wait for disconnect and then assert files exist
      _domainManager.once('disconnected', function() {

        // assert file state
        stats = fs.statSync(LOCALPATH + '/bin.py');
        assert.equal(stats.size, 220);
        stats = fs.statSync(LOCALPATH + '/index.html');
        assert.equal(stats.size, 136);
        // check for presence of subdir and file inside
        stats = fs.statSync(LOCALPATH + '/code');
        assert(stats.isDirectory);
        stats = fs.statSync(LOCALPATH + '/code/re.py');
        assert.equal(stats.size, 444);

        done();
      });
    });

    
    it('sync directory structure to root', function(done) {
      LOCALROOT = "./testdata/test3";
      REMOTEROOT = ".";
      LOCALPATH = LOCALPREFIX;

      // do NOT empty remoteroot as it could be users homedir

      ftpsync.connect(HOST, PORT, USER, PWD, LOCALROOT, REMOTEROOT, _domainManager);

      // wait for disconnect and then assert files exist
      _domainManager.once('disconnected', function() {

        // check for presence of subdir and file inside
        stats = fs.statSync(LOCALPATH + '/ftptest');
        assert(stats.isDirectory);
        stats = fs.statSync(LOCALPATH + '/ftptest/application');
        assert(stats.isDirectory);
        stats = fs.statSync(LOCALPATH + '/ftptest/application/cache');
        assert(stats.isDirectory);
        stats = fs.statSync(LOCALPATH + '/ftptest/application/cache/index.html');
        assert.equal(stats.size, 136);
        stats = fs.statSync(LOCALPATH + '/ftptest/application/views');
        assert(stats.isDirectory);
        stats = fs.statSync(LOCALPATH + '/ftptest/application/views/generix');
        assert(stats.isDirectory);
        stats = fs.statSync(LOCALPATH + '/ftptest/application/views/generix/bogus.php');
        assert.equal(stats.size, 444);
        stats = fs.statSync(LOCALPATH + '/ftptest/application/views/generix/some_long_filename.php');
        assert.equal(stats.size, 220);
        done();
      });
    });

    
  });

}());