/*
 * Copyright (c) 2013 Tim Burgess. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true, white: true */
/*global */

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
    

        
    function final(emitOK) {
        if (emitOK === undefined) { emitOK = true; }
        ftp.raw.quit(function (err, data) {
            if (emitOK) {
                _domainManager.emitEvent("ftplite", "disconnected", data.text);
            }
            console.log(data.text);
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
    
        ftp.raw.mkd(remotePath, function (err) {
            if (err) {
                if (err.code !== 550) {
                    console.log('remote mkdir failed:' + err);
                }
            } else {
                _domainManager.emitEvent("ftplite", "mkdir", "created " + remotePath);
                console.log('created remote dir ' + remotePath); }
            return series(ops.shift());
        });
    }
    
    // push up a copy of local file
    function putOp(localPath, remotePath) {
    
        ftp.getPutSocket(remotePath, function (err, socket) {
            if (err) {
                console.log('socket fail:' + err);
            } else {
                var read = fs.createReadStream(localPath, { bufferSize: 4 * 1024 });
                // socket is a writeable stream
                read.pipe(socket);
                read.on("error", function(err) {
                    console.log('socket error:' + err);
                });
                read.on("end", function() {
                    _domainManager.emitEvent("ftplite", "uploaded", "uploaded " + remotePath);
                    console.log('uploaded ' + remotePath);
                    return series(ops.shift());
                });
            }
        });
    }
    
    // stat remote file. add dirOp or pushOp if required
    function statOp(localPath, remotePath) {
        
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


    
    function connect() {
        // check that local dir exists, walk local fs
        fs.exists(LOCALROOT, function (exists) {
            if (!exists) { 
                _domainManager.emitEvent("ftplite", "error", LOCALROOT + ' does not exist');
                console.log('local directory ' + LOCALROOT + ' does not exist');
                return;
            }
            
            // connect to remote
            ftp.auth(USER, PWD, function (err, data) {
                if (err) { 
                    _domainManager.emitEvent("ftplite", "error", err.toString());
                    console.log('Failed to connect to remote: ' + err);
                    return;
                }

                // emit connect
                _domainManager.emitEvent("ftplite", "connected", data.text);
                console.log('Connected ' + data.text);

                // check for presence of remote path
                ftp.ls(REMOTEROOT, function (err, res) {
                    if (err || res.length === 0) {
                        _domainManager.emitEvent("ftplite", "error", "Error: remote root directory does not exist");
                        console.log('cannot stat remote root');
                        
                        // we'e authed so we need to disconnect
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
                });
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
        if (!DomainManager.hasDomain("ftplite")) {
            DomainManager.registerDomain("ftplite", {major: 0, minor: 1});
        }
        _domainManager = DomainManager;

        DomainManager.registerCommand(
            "ftplite",       // domain name
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
            "ftplite",       // domain name
            "ftpStop",    // command name
            cmdFtpStop,   // function name
            false,          // this command is synchronous
            "Flags any ops underway to halt",
            // input parms
            [],
            [] // returns
        );
        
        DomainManager.registerEvent(
            "ftplite",
            "connected",
            [{  name: "result",
                type: "string",
                description: "result"}]
        );
        DomainManager.registerEvent(
            "ftplite",
            "disconnected",
            [{  name: "result",
                type: "string",
                description: "result"}]
        );
        DomainManager.registerEvent(
            "ftplite",
            "uploaded",
            [{  name: "result",
                type: "string",
                description: "result"}]
        );
        DomainManager.registerEvent(
            "ftplite",
            "mkdir",
            [{  name: "result",
                type: "string",
                description: "result"}]
        );

        DomainManager.registerEvent(
            "ftplite",
            "error",
            [{  name: "result",
                type: "string",
                description: "result"}]
        );

        
    }
    
    exports.init = init;
    
}());
