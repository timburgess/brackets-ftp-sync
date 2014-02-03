/*
 * Copyright (c) 2013-2014 Tim Burgess. All rights reserved.
 *  
 * @author Tim Burgess <info@tim-burgess.com>
 * @license Tim Burgess 2014
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true, white: true */
/* global */

(function () {
    "use strict";
    
    var os = require("os"),
     JSFtp = require("jsftp"),
        fs = require("fs");
    
    var _domainManager;

    var HOST;
    var PORT;
    var USER;
    var PWD;
    var LOCALROOT;
    var REMOTEROOT;

    var ftp;
    var processOps = false;
    var haltCalled = false;
    var ops = [];
    
    var emit = true;
    

    
    function final(emitOK) {
        if (emitOK === undefined) { emitOK = true; }
        ftp.raw.quit(function (err, data) {
            if (emitOK) {
                emit && _domainManager.emitEvent("ftpsync", "disconnected", data.text);
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
                emit && _domainManager.emitEvent("ftpsync", "mkdir", "created " + remotePath);
                console.log('created remote dir ' + remotePath); }
            return series(ops.shift());
        });
    }
    
    
    function putOp(localPath, remotePath) {
        var readStream = fs.createReadStream(localPath);
        ftp.put(readStream, remotePath, function(err) {
            if (err) {
                console.log('upload error:' + err);
            }
            emit && _domainManager.emitEvent("ftpsync", "uploaded", "uploaded " + remotePath);
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
            emit && _domainManager.emitEvent("ftpsync", "error", "Error: remote directory does not exist");
            console.log('cannot cwd remote root: ' + REMOTEROOT);
            // we'e authed so we need to disconnect
            final(false);
            return;
        }
        
        // remote dir exists, so capture how many levels down
        var subnum = REMOTEROOT.split('/').length;
        var i, upPath = "..";
        for (i = 0; i < subnum-1; i++) { upPath = upPath + "/.."; }
            
        // pop up from prior CWD and then walk the tree
        ftp.raw.cwd(upPath, function (err, res) {
            if (err) {
                // somehow we had a popup issue, so exit
                emit && _domainManager.emitEvent("ftpsync", "error", "Error: remote directory does not exist");
                console.log('cannot cwd remote root: ' + REMOTEROOT);
                final(false);
                return;
            }
            
            // get the login dir and prefix to REMOTEROOT
            ftp.raw.pwd(function (err, data) {
                if (err) {
                    // we'e authed so we need to disconnect
                    final(false);
                    return;
                }
                console.log(data);
                
                var raw = data.text.split(' ')[1];
                // strip out quotes in path
                var prefix = raw.replace(/\"/g, "");
                if (prefix[prefix.length-1] !== '/') prefix += '/';
                console.log('logged in at ' + prefix);
                REMOTEROOT = prefix + REMOTEROOT;
                console.log('full remote path is ' + REMOTEROOT);
    
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
        });
    }
        
    
    
    function connect() {
        // check that local dir exists, walk local fs
        fs.exists(LOCALROOT, function (exists) {
            if (!exists) { 
                emit && _domainManager.emitEvent("ftpsync", "error", LOCALROOT + ' does not exist');
                console.log('local directory ' + LOCALROOT + ' does not exist');
                return;
            }
            
            // connect to remote
            ftp.auth(USER, PWD, function (err, data) {
                if (err) { 
                    emit && _domainManager.emitEvent("ftpsync", "error", err.toString());
                    console.log('Failed to connect to remote: ' + err);
                    return;
                }

                // emit connect
                emit && _domainManager.emitEvent("ftpsync", "connected", data.text);
                console.log('Connected ' + data.text);
                
                // check REMOTEROOT is a valid directory
                ftp.raw.cwd(REMOTEROOT, checkRemoteDir);
            });
        });
    }
                            

    
    /**
     * @private
     * Handler function for the ftp upload
     */
    function cmdFtpUpload(host, port, user, pwd, localroot, remoteroot) {
        
        HOST = host;
        PORT = parseInt(port, 10);
        USER = user;
        PWD = pwd;
        LOCALROOT = localroot;
        REMOTEROOT = remoteroot;
        
        ftp = new JSFtp({ host: HOST, port: PORT });
        
        connect();
        
    }

    /**
     * @private
     * Handler function for setting stop flag
     */
    function cmdFtpStop() {
        haltCalled = true;
        console.log('ftp transfer stopping');
    }

    
    /**
     * Initializes the test domain with several test commands.
     * @param {DomainManager} DomainManager The DomainManager for the server
     */
    function init(DomainManager) {
        if (!DomainManager.hasDomain("ftpsync")) {
            DomainManager.registerDomain("ftpsync", {major: 0, minor: 1});
        }
        _domainManager = DomainManager;

        DomainManager.registerCommand(
            "ftpsync",       // domain name
            "ftpUpload",    // command name
            cmdFtpUpload,   // function name
            false,          // this command is synchronous
            "Uploads working dir to ftp server",
            // input parms
            [{  name: "host",
                type: "string",
                description: "host"}],
            [{  name: "port",
                type: "string",
                description: "username"}],
            [{  name: "user",
                type: "string",
                description: "username"}],
            [{  name: "pwd",
                type: "string",
                description: "password"}],
            [{  name: "localroot",
                type: "string",
                description: "localroot"}],
            [{  name: "remoteroot",
                type: "string",
                description: "remoteroot"}],
            [] // returns
        );


        DomainManager.registerCommand(
            "ftpsync",       // domain name
            "ftpStop",    // command name
            cmdFtpStop,   // function name
            false,          // this command is synchronous
            "Flags any ops underway to halt",
            // input parms
            [],
            [] // returns
        );
        
        DomainManager.registerEvent(
            "ftpsync",
            "connected",
            [{  name: "result",
                type: "string",
                description: "result"}]
        );
        DomainManager.registerEvent(
            "ftpsync",
            "disconnected",
            [{  name: "result",
                type: "string",
                description: "result"}]
        );
        DomainManager.registerEvent(
            "ftpsync",
            "uploaded",
            [{  name: "result",
                type: "string",
                description: "result"}]
        );
        DomainManager.registerEvent(
            "ftpsync",
            "mkdir",
            [{  name: "result",
                type: "string",
                description: "result"}]
        );

        DomainManager.registerEvent(
            "ftpsync",
            "error",
            [{  name: "result",
                type: "string",
                description: "result"}]
        );

        
    }
    
    exports.init = init;
    
}());
