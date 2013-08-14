/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true, white: true */
/*global */

"use strict";

var JSFtp = require("jsftp"),
    fs = require("fs");


var HOST = "localhost";
var USER = "tim";
var PWD = "puddlejump";
var LOCALROOT = "/Users/tim/test";
var REMOTEROOT = "work/test";


var ftp = new JSFtp({
    host: HOST
});

var processOps = false;
var ops = [];


function final() {
    ftp.raw.quit(function(err, data) {
        console.log(data.text);
        console.log('finished');
    });
}

function series(op) {

    if (op) {
        var func = op[0];
        console.log(func);
        func(op[1], op[2]);
    } else {
        return final();
    }
}

// make a remote dir
function dirOp(localPath, remotePath) {

    ftp.raw.mkd(remotePath, function(err) {
        if (err) {
            if (err.code !== 550) {
                console.log('mkdir failed:' + err);
            }
        } else { console.log('created dir:' + remotePath); }
        return series(ops.shift());
    });
}


// push up a copy of local file
function putOp(localPath, remotePath) {

    ftp.getPutSocket(remotePath, function(err, socket) {
        console.log('in put socket callback for ' + remotePath);
        if (err) {
            console.log('getPutSocketFail:' + err);
        } else {
            console.log('writing to socket');
            var read = fs.createReadStream(localPath, { bufferSize: 4 * 1024 });
            read.pipe(socket);
            read.on("error", function(err) {
                console.log('pipe err:' + err);
            });
            read.on("end", function() {
                console.log('socket end');
                return series(ops.shift());
            });

        }
    });
}

// stat remote file. add dirOp or pushOp if required
function statOp(localPath, remotePath) {
    
    ftp.ls(remotePath, function(err, res) {
        if (err) {
            console.log('cannot stat remote file:' + err);
        } else {
            if (res.length > 0) {
                // found remote file with same name
                // if filesize not the same, push up local
                console.log('found:' + res[0].name + ' ' + res[0].size);
                
                var size = fs.statSync(localPath).size;
                if (size !== parseInt(res[0].size,10)) {
                    console.log('different size: ' + size);
                    console.log('putOp, ' + localPath + ',' + remotePath);
//                    ops.push([putOp, localPath, remotePath]);
                }
            } else {
                // no remote file, add push op
                console.log('not found:' + remotePath);
//                console.log('putOp, ' + localPath + ',' + remotePath);
                ops.push([putOp, localPath, remotePath]);
            }
        }
        return series(ops.shift());
    });
}


             

// check that local dir exists
fs.exists(LOCALROOT, function(exists) {
    if (!exists) { return console.log('Local path does not exist'); }
    
    // connect to remote
    ftp.auth(USER, PWD, function(err, data) {
        if (err) { return console.log('Failed to connect to remote: ' + err); }
    
        console.log('Connected ' + data.text);
        //console.log(data.code);
        
        // setup walk function
        var walkFileSystem = function(pathSuffix) {
            var fullPath = LOCALROOT + pathSuffix;

            var files = fs.readdirSync(fullPath);
            var i;
            for (i in files) {
                // ignore hiddenfiles
                if (files[i].substring(0, 1) !== '.') {

                    var currentFile = fullPath + files[i];
                    var remotePath = REMOTEROOT + pathSuffix + files[i];
                    var stats = fs.statSync(currentFile);

                    if (stats.isFile()) {
                        console.log(currentFile + ' ' + stats.size + ' -> ' + remotePath);
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
