/*
 * Copyright (c) 2013 Tim Burgess. All rights reserved.
 *  
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, browser: true, white:true */
/*global $, define, Mustache, brackets, debugger */

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


    // save settings used in dialog so we can populate future dialog    
    function saveSettings() {
        
        var destinationDir = ProjectManager.getProjectRoot().fullPath;
        console.log(destinationDir);        
        var fileEntry = new FileSystem.FileEntry(destinationDir + ".ftplitesettings");
        var settingsData = JSON.stringify(ftpSettings);
        FileUtils.writeText(fileEntry, settingsData).done(function () {
        });
    }
    
    // pull settings from .ftplitesettings
    function readSettings() {
        var destinationDir = ProjectManager.getProjectRoot().fullPath;

        FileSystem.resolveNativeFileSystemPath(destinationDir + ".ftplitesettings", function (fileEntry) {
            FileUtils.readAsText(fileEntry).done(function (text) {
                // settings file exists so parse
                ftpSettings = $.parseJSON(text);
            }).fail(function (error) {
                // file apparently existed but we can't read it - ignore
            });
        }, function (error) {
            console.log("no existing ftp settings");
        });
    }
    
    // handle Upload button
    function handleOk() {

        // get input values and save settings
        var $dlg = $(".ftp-dialog.instance");
        ftpSettings.host = $dlg.find("#host").val();
        ftpSettings.port = $dlg.find("#port").val();
        ftpSettings.user = $dlg.find("#user").val();
        ftpSettings.pwd = $dlg.find("#pwd").val();
        ftpSettings.remoteRoot = $dlg.find("#remoteroot").val();

        saveSettings();
        
        // determine the local root
        ftpSettings.localRoot = ProjectManager.getProjectRoot().fullPath;

        // call ftp upload
        callFtpUpload();
        
        // dialog closes on recipt of disconnect event
    }
        
    // handle cancel button
    function handleCancel() {

        Dialogs.cancelModalDialogIfOpen("ftp-dialog");
    }

    
    // show the ftp dialog and get references    
    function showFtpDialog() {

        var templateVars = {
            host: ftpSettings.host,
            port: ftpSettings.port,
            user: ftpSettings.user, // don't populate pwd field
            remoteroot: ftpSettings.remoteRoot,
            Strings: Strings
        };
        
        Dialogs.showModalDialogUsingTemplate(Mustache.render(mainDialog, templateVars), false);

        // focus to host input and add button handlers
        var $dlg = $(".ftp-dialog.instance");
        $dlg.find("#host").focus();
        $dlg.find(".dialog-button[data-button-id='ok']").on("click", handleOk);
        $dlg.find(".dialog-button[data-button-id='cancel']").on("click", handleCancel);

    }
    
    // pass parms to node for ftp upload
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

    
    // general event handler of node-side events
    function handleEvent(event, msg) {

        var $dlg = $(".ftp-dialog.instance");

        debugger;
        if (event.namespace === "error") {
            $dlg.find("#status").html(msg);
            // do this in red
            return;
        }
            
        if (event.namespace === "connected") {
            //start spinner
            $dlg.find(".spinner").addClass("spin");
        } else if (event.namespace === "disconnected") {
            //stop spinner
            $dlg.find(".spinner").removeClass("spin");
        }            
        var $status = $dlg.find("#status");
        msg.split('\n').forEach(function (line) {
            if (line.length > 66) {
                line = line.substr(0,66) + "..";
            }
            $status.html(line);
        });
        
        // close dialog on disconnect
        if (event.namespace === "disconnected") {
            Dialogs.cancelModalDialogIfOpen("ftp-dialog");
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

            
        
        // Call all the helper functions in order
        chain(connect, loadFtpDomain, logMemory);
            
        readSettings();

        // listen for events
        $(nodeConnection).on("ftplite.connected", handleEvent);
        $(nodeConnection).on("ftplite.disconnected", handleEvent);
        $(nodeConnection).on("ftplite.uploaded", handleEvent);
        $(nodeConnection).on("ftplite.mkdir", handleEvent);
        $(nodeConnection).on("ftplite.error", handleEvent);

        
        
        console.log('binding Alt-F');
        CommandManager.register("ftplite", COMMAND_ID2, callFtpUpload);
        KeyBindingManager.addBinding(COMMAND_ID2, "Alt-F", "mac");

        console.log('binding Ctrl-W');
        CommandManager.register("ftplitedialog", COMMAND_ID, showFtpDialog);
        KeyBindingManager.addBinding(COMMAND_ID, "Ctrl-W", "mac");
        KeyBindingManager.addBinding(COMMAND_ID, "Ctrl-W", "win");
        

    });
        
});
