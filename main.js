/*
 * Copyright (c) 2013 Tim Burgess. All rights reserved.
 *  
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, browser: true, white:true */
/*global $, define, Mustache, brackets */

define(function (require, exports, module) {
    "use strict";

    var COMMAND_ID = "timburgess.ftplite";
    var COMMAND_ID2 = "timburgess.ftplite2";
    
    var AppInit             = brackets.getModule("utils/AppInit"),
        ProjectManager      = brackets.getModule("project/ProjectManager"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        KeyBindingManager   = brackets.getModule("command/KeyBindingManager"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        NodeConnection      = brackets.getModule("utils/NodeConnection"),
        Dialogs             = brackets.getModule("widgets/Dialogs"),
        FileSystem = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        FileUtils = brackets.getModule("file/FileUtils"),
        Strings             = brackets.getModule("strings");

    
    var mainDialog       = require("text!ftp-dialog.html");


    var nodeConnection;
    
    var ftpSettings = {
        host : "localhost",
        port : "21",
        user : "",
        pwd : "",
        localRoot : "",
        remoteRoot : ""
    };


    // save settings used in dialog so we can populate dialog on call    
    function saveSettings() {
        
        var destinationDir = ProjectManager.getProjectRoot().fullPath;
        console.log(destinationDir);        
        var fileEntry = new FileSystem.FileEntry(destinationDir + ".ftplitesettings");
        var settingsData = JSON.stringify(ftpSettings);
        FileUtils.writeText(fileEntry, settingsData).done(function () {
        });
    }
    
    
//    function readSettings() {
//        var destinationDir = ProjectManager.getProjectRoot().fullPath;
//        var fileEntry = new FileSystem.FileEntry(destinationDir + ".remotesettings");
//        if (fileEntry) {
//            var readSettingsPromise = FileUtils.readAsText(fileEntry);
//        
//            readSettingsPromise.done(function (result) {
//                //remotesettings file does exist, read in JSON into object                
//                if (result) {
//                    toggleRemoteBrowserAvailability(true);
//                    projectFtpDetails = $.parseJSON(result);
//                    if(projectFtpDetails.protocol === "sftp"){
//                        toggleRemoteBrowserAvailability(false);    
//                    }else{
//                        toggleRemoteBrowserAvailability(true);    
//                    }                        
//                }
//            });
//            readSettingsPromise.fail(function (err) {
//                //remotesettings file does not exist
//                projectFtpDetails.server = "";
//                projectFtpDetails.protocol = "";
//                projectFtpDetails.port = 21;
//                projectFtpDetails.username = "";
//                projectFtpDetails.password = "";
//                projectFtpDetails.localpath = "";
//                projectFtpDetails.remotepath = "";
//                projectFtpDetails.uploadOnSave = false;
//                
//                toggleRemoteBrowserAvailability(false);
//            });
//        }
//    }

    
    function showFtpDialog() {

        var dialog,
            $baseUrlControl;

        var templateVars = {
            title: "Enter a URL to get",
            label: "URL:",
            baseUrl: "http://",
            Strings: Strings
        };
        
        dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(mainDialog, templateVars));
        dialog.done(function (id) {
            if (id === Dialogs.DIALOG_BTN_OK) {
                // grab data and call upload
                console.log('clicked on OK');
            }
        });
        
        // give focus to url text
//        $baseUrlControl = dialog.getElement().find(":input");
//        $baseUrlControl.focus();

        return dialog;
    }

    
    // Helper function that chains a series of promise-returning
    // functions together via their done callbacks.
    function chain() {
        var functions = Array.prototype.slice.call(arguments, 0);
        if (functions.length > 0) {
            var firstFunction = functions.shift();
            var firstPromise = firstFunction.call();
            firstPromise.done(function () {
                chain.apply(null, functions);
            });
        }
    }

    
    AppInit.appReady(function () {

        // Create a new node connection.
        nodeConnection = new NodeConnection();
        
        // Every step of communicating with node is asynchronous, and is
        // handled through jQuery promises. To make things simple, we
        // construct a series of helper functions and then chain their
        // done handlers together. Each helper function registers a fail
        // handler with its promise to report any errors along the way.
        
        
        // Helper function to connect to node
        function connect() {
            var connectionPromise = nodeConnection.connect(true);
            connectionPromise.fail(function () {
                console.error("[ftp-lite] failed to connect to node");
            });
            return connectionPromise;
        }
        
        // Helper function that loads our domain into the node server
        function loadFtpDomain() {
            var path = ExtensionUtils.getModulePath(module, "node/ftpDomain");
            var loadPromise = nodeConnection.loadDomains([path], true);
            loadPromise.fail(function () {
                console.log("[ftp-lite] failed to load domain");
            });
            return loadPromise;
        }
        
        // Helper function that runs the simple.getMemory command and
        // logs the result to the console
        function logMemory() {
            var memoryPromise = nodeConnection.domains.ftplite.getMemory();
            memoryPromise.fail(function (err) {
                console.error("[ftp-lite] failed to run getMemory", err);
            });
            memoryPromise.done(function (memory) {
                console.log(
                    "[ftp-lite] Memory: %d of %d bytes free (%d%)",
                    memory.free,
                    memory.total,
                    Math.floor(memory.free * 100 / memory.total)
                );
            });
            return memoryPromise;
        }


        function callFtpUpload() {
            var ftpPromise = nodeConnection.domains.ftplite.ftpUpload(ftpSettings.host, ftpSettings.port, ftpSettings.user, ftpSettings.pwd, ftpSettings.localRoot, ftpSettings.remoteRoot);
            ftpPromise.fail(function (err) {
                console.error("[ftp-lite] failed to complete ftp upload:", err);
            });
            ftpPromise.done(function (memory) {
                console.log("[ftp-lite] started ftp upload");
            });
            return ftpPromise;
        }

        // Call all the helper functions in order
        chain(connect, loadFtpDomain, logMemory);
        
        saveSettings();
        
        console.log('binding Alt-F');
        CommandManager.register("ftplite", COMMAND_ID2, callFtpUpload);
        KeyBindingManager.addBinding(COMMAND_ID2, "Alt-F", "mac");

        console.log('binding Alt-W');
        CommandManager.register("ftplitedialog", COMMAND_ID, showFtpDialog);
        KeyBindingManager.addBinding(COMMAND_ID, "Alt-W", "mac");
        KeyBindingManager.addBinding(COMMAND_ID, "Alt-W", "win");
        

    });
        
});
