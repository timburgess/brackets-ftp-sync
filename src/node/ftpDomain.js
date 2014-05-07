/*
 * Copyright (c) 2013-2014 Tim Burgess. All rights reserved.
 *  
 * @author Tim Burgess <info@tim-burgess.com>
 * @license Tim Burgess 2014
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true, white: true */
/*globals HOST:true,PORT:true,USER:true,PWD:true*/



(function () {
    "use strict";
    
    var ftpsync = require("./core.js");

    var _domainManager;


    /**
     * @private
     * Handler function for the ftp upload
     */
    function cmdFtpUpload(ftpSettings, localRoot) {
        
      ftpSettings.port = parseInt(ftpSettings.port, 10);
      ftpsync.connect(ftpSettings, localRoot, _domainManager);
    }

    /**
     * @private
     * Handler function for setting stop flag
     */
    function cmdFtpStop() {
        ftpsync.halt();
    }

    
    /**
     * Initializes the ftpsync domain.
     * @param {DomainManager} DomainManager - passes events to console
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
            [{  name: "ftpSettings",
                type: "object",
                description: "user settings"}],
            [{  name: "localRoot",
                type: "string",
                description: "project root path"}],
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
            "chkdir",
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
