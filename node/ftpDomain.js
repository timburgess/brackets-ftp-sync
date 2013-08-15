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
    var ops = [];
    
    // pass an event to client-side
//    emit(eventName, msg) {
//        _domainManager.emitEvent("ftplite", eventName, msg);
//    }

        
    function final() {
        ftp.raw.quit(function (err, data) {
            _domainManager.emitEvent("ftplite", "disconnected", data.text);
            console.log(data.text);
            processOps = false;
        });
    }

    // control-flow
    function series(op) {
    
        if (op) {
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
            } else { console.log('created remote dir ' + remotePath); }
            return series(ops.shift());
        });
    }
    
    // push up a copy of local file
    function putOp(localPath, remotePath) {
    
        ftp.getPutSocket(remotePath, function (err, socket) {
            if (err) {
                console.log('getPutSocketFail:' + err);
            } else {
                var read = fs.createReadStream(localPath, { bufferSize: 4 * 1024 });
                // socket is a writeable stream
                read.pipe(socket);
                read.on("error", function(err) {
                    console.log('socket error:' + err);
                });
                read.on("end", function() {
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
            if (!exists) { return console.log('local directory ' + LOCALROOT + ' does not exist'); }
            
            // connect to remote
            ftp.auth(USER, PWD, function (err, data) {
                if (err) { return console.log('Failed to connect to remote: ' + err); }

                // emit
                _domainManager.emitEvent("ftplite", "connected", data.text);
                console.log('Connected ' + data.text);
                
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
    }

        
    function cmdGetMemory() {
        console.log('in cmdGetMemory');
        return {total: os.totalmem(), free: os.freemem()};
    }
    /**
     * @private
     * Handler function for the simple.getMemory command.
     * @return {{total: number, free: number}} The total and free amount of
     *   memory on the user's system, in bytes.
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
            "getMemory",    // command name
            cmdGetMemory,   // function name
            false,          // this command is synchronous
            "Returns the total and free memory on the user's system in bytes",
            [],             // no parameters
            [{name: "memory",
                type: "{total: number, free: number}",
                description: "amount of total and free memory in bytes"}]
        );
        
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


    }
    
    exports.init = init;
    
}());
