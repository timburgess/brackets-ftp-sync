/*
 * Copyright (c) 2013-2014 Tim Burgess. All rights reserved.
 *  
 * @author Tim Burgess <info@tim-burgess.com>
 * @license Tim Burgess 2014
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true, white: true */
/* global */


// node code
var fs = require('fs'),
domain = require('domain').create(),
 JSFtp = require('jsftp');

// var HOST = '192.168.0.99';
var HOST = 'webedge';
var PORT = 21;
var USER = 'a9113008';
var PWD = 'koen11';



// ENOTFOUND and ETIMEDOUT
// create a domain
domain.on('error', function(err) {
    if (err.code === 'ETIMEDOUT') {
        console.log('timed out');
    } else if (err.code === 'ENOTFOUND') {
        console.log('unable to find host');
    } else {
        console.log(err);
    }
});

domain.enter();
var ftp = new JSFtp({
    host: HOST
});


// connect to remote
ftp.auth(USER, PWD, function (err, data) {
    if (err) { 
        console.log('Failed to connect to remote: ' + err);
        return;
    }

    // emit connect
    console.log('Connected ' + data.text);

    // check REMOTEROOT is a valid directory
    ftp.raw.quit(function (err, data) {
        console.log('quit:' + data);
    });
});
domain.exit();



