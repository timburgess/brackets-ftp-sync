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
      rimraf = require("rimraf");
  
  
  function MockDomainManager() {
    this._eventCount = 0;
  }
  util.inherits(MockDomainManager, events.EventEmitter);


  MockDomainManager.prototype.emitEvent = function(domainName, eventName, parameters) {
    if (parameters)
      console.log("[%s] %s", eventName, parameters);
    else
      console.log("[%s]", eventName);
    // don't emit errors as they will simply be rethrown
    if (eventName !== 'error') {
      this.emit(eventName);
    }
    ++this._eventCount;
  };

  // load ftp settings
  var config = require('./config.json');
  
  // load node-side
  var ftpsync = require("../core.js");
  
  // mock domainmanager for event capture
  var _domainManager = new MockDomainManager();

  var opts = {
    // we don't set connect option as ftp should be the default
    host: config.host,
    port: 21,
    user: config.user,
    pwd:  config.pwd,
//TODO    debug: console.log
  };
  
  // directory where ftp server puts you at login
  var LOCALPREFIX = config.localprefix;
  
  // the remote root directory is located locally, so we use fs
  // and LOCALPATH for asserting presence & size of test files 
  var LOCALPATH;

  
  // before each test, rm -rf ftptest
  describe('FTP-Sync', function() {

    beforeEach(function(done) {
      rimraf.sync(LOCALPREFIX + '/ftptest');
      done();
    });
               
    describe('FTP test:', function() {

      it('sync file changes', function(done) {
        
        opts.localRoot = "./testdata/test1";
        opts.remoteRoot = "ftptest/public_html";
        LOCALPATH = LOCALPREFIX + '/' + opts.remoteRoot;

        // create public_html dir
        fs.mkdirSync(LOCALPREFIX + '/ftptest');
        fs.mkdirSync(LOCALPATH);

        ftpsync.connect(opts, _domainManager);

        // wait for disconnect and then assert files exist
        _domainManager.once('disconnected', function() {

          // assert file state
          stats = fs.statSync(LOCALPATH + '/bin.py');
          assert.equal(stats.size, 220);
          stats = fs.statSync(LOCALPATH + '/index.html');
          assert.equal(stats.size, 136);
          stats = fs.statSync(LOCALPATH + '/re.py');
          assert.equal(stats.size, 444);

          opts.localRoot = "./testdata/test1A";
          ftpsync.connect(opts, _domainManager);

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
        opts.localRoot = "./testdata/test2";
        opts.remoteRoot = "ftptest/public_html";
        LOCALPATH = LOCALPREFIX + '/' + opts.remoteRoot;

        // create public_html dir
        fs.mkdirSync(LOCALPREFIX + '/ftptest');
        fs.mkdirSync(LOCALPATH);

        ftpsync.connect(opts, _domainManager);

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
      
      it('sync directory structure to ftp root', function(done) {
        opts.localRoot = "./testdata/test3";
        opts.remoteRoot = ".";
        LOCALPATH = LOCALPREFIX;

        ftpsync.connect(opts, _domainManager);

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

      it('sync directory structure to empty string remoteroot', function(done) {
        opts.localRoot = "./testdata/test3";
        opts.remoteRoot = "";
        LOCALPATH = LOCALPREFIX;

        ftpsync.connect(opts, _domainManager);

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

      it('sync directory structure to null remoteroot', function(done) {
        opts.localRoot = "./testdata/test3";
        opts.remoteRoot = null;
        LOCALPATH = LOCALPREFIX;

        ftpsync.connect(opts, _domainManager);

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

      it('sync directory structure to undefined remoteroot', function(done) {
        opts.localRoot = "./testdata/test3";
        opts.remoteRoot = undefined;
        LOCALPATH = LOCALPREFIX;

        ftpsync.connect(opts, _domainManager);

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
  });
