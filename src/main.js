/*
 * Copyright (c) 2013-2014 Tim Burgess. All rights reserved.
 *
 * @author Tim Burgess <info@tim-burgess.com>
 * @license Tim Burgess 2014
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, browser: true, white:true */
/*global $, define, Mustache, brackets, debugger */

define(function (require, exports, module) {
  "use strict";

  var COMMAND_ID = "timburgess.ftpsync";

  var AppInit             = brackets.getModule("utils/AppInit"),
      ProjectManager      = brackets.getModule("project/ProjectManager"),
      CommandManager      = brackets.getModule("command/CommandManager"),
      KeyBindingManager   = brackets.getModule("command/KeyBindingManager"),
      NodeDomain          = brackets.getModule("utils/NodeDomain"),
      ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
      Dialogs             = brackets.getModule("widgets/Dialogs"),
      FileSystem          = brackets.getModule("filesystem/FileSystem"),
      FileUtils           = brackets.getModule("file/FileUtils"),
      Strings             = brackets.getModule("strings");


  var mainDialog       = require("text!htmlContent/ftp-dialog.html");
  var toolbar          = require("text!htmlContent/ftp-toolbar.html");

  var ftpDomain;
  var defaultKeyPath = "";

  var inProcess = false; // whether ftp is underway

  var ftpSettings;
  
  // set FTP opts to default
  function settingsToDefault() {
    ftpSettings = {
        connect: "FTP",
        host : "localhost",
        port : "21",
        user : "",
        pwd : "",
        savepwd: "",
        remoteRoot : ""
    };
  }

  // save settings used in dialog so we can populate future dialogs
  // password is never saved
  function saveSettings() {

    var projectRoot = ProjectManager.getProjectRoot().fullPath;
    var file = FileSystem.getFileForPath(projectRoot + '.ftpsync_settings');

    //  Replace date object with equivalent time since 
    function replacePwd(key, value) {
      if (key === "pwd") return undefined;
      return value;
    }
    // if save password is checked, no need to remove pwd from settings
    if (ftpSettings.savepwd === 'checked')
      FileUtils.writeText(file, JSON.stringify(ftpSettings));
    else
      FileUtils.writeText(file, JSON.stringify(ftpSettings, replacePwd));
  }

  // pull saved dialog settings from .ftpsync_settings in project root
  function readSettings(callback) {

    var destinationDir = ProjectManager.getProjectRoot().fullPath;
    FileSystem.resolve(destinationDir + ".ftpsync_settings", function (err, fileEntry) {
      if (!err) {
        FileUtils.readAsText(fileEntry).done(function (text) {
          // settings file exists so parse
          console.log('[ftp-sync] parsed .ftpsync_settings');
          ftpSettings = $.parseJSON(text);
          if (ftpSettings.lastSyncDate === undefined) {
            ftpSettings.lastSyncDate = 0;
          }
          
          if (ftpSettings.connect === undefined) ftpSettings.connect = 'FTP';
          callback();
        });
      } else {
        console.log("[ftp-sync] no existing ftp settings");
        // if no settings file, overwrite ftpSettings in memory
        settingsToDefault();
        callback();
      }
    });
  }

  
  // handle FTP-SFTP select
  function handleSelect() {
    
    $(this).parent().find('.active').removeClass('active');
    $(this).addClass('active');
    ftpSettings.connect = $(this).text();
    
    var currentPort = $("#port").val();
    
    var keyfileDisabled;
    if (ftpSettings.connect === 'FTP') {
      keyfileDisabled = true;
      if(!currentPort || currentPort == 22) $("#port").val('21');
    } else {
      keyfileDisabled = false;
      if(!currentPort || currentPort == 21) $("#port").val('22');
    }
    $("#keyfile").prop('disabled', keyfileDisabled);
    $(".dialog-button[data-button-id='browse']").prop('disabled', keyfileDisabled);

  }

  // handle Upload button
  function handleOk() {

    // get input values and save settings
    var $dlg = $(".ftp-dialog.instance");
    ftpSettings.host = $dlg.find("#host").val();
    ftpSettings.port = $dlg.find("#port").val();
    ftpSettings.user = $dlg.find("#user").val();
    if (ftpSettings.connect === 'SFTP') ftpSettings.privateKeyFile = $dlg.find("#keyfile").val();
    ftpSettings.pwd = $dlg.find("#pwd").val();
    ftpSettings.savepwd = $dlg.find("#savepwd:checked").val();
    ftpSettings.remoteRoot = $dlg.find("#remoteroot").val();

    saveSettings();

    // determine the local root
    var localRoot = ProjectManager.getProjectRoot().fullPath;

    // emit a connecting event for dialog status
    handleEvent({ type: "ftpsync:connecting" }, "Connecting..." );

    // call ftp upload
    inProcess = true;
    callFtpUpload(localRoot);

    // dialog closes on receipt of disconnect event
  }

  // handle cancel button
  function handleCancel() {

    if (inProcess) { // if ftp underway, call cancel on node-side
        callFtpStop();
        inProcess = false;
    } else { // dialog will close on disconnect event
        Dialogs.cancelModalDialogIfOpen("ftp-dialog");
    }
  }
  
  // on browse click, allow user to select the
  // path to the private keyfile
  function handleBrowse() {
    
    FileSystem.showOpenDialog(false, false, 'Select private keyfile', '/Users/tim/.ssh', null,
                  function(err, pathArray) {
                    if (err) {
                      console.log('[ftp-sync] ' + err);
                      return; // failed to provide a path so just ignore
                    }
                    if (pathArray.length !== 0) {
                      console.log('[ftp-sync] private keyfile is ' + pathArray[0]);
                      ftpSettings.privateKeyFile = pathArray[0];
                      $("#keyfile").val(pathArray[0]);
                    }
                  });
  }

  function handleDisconnect (event, completed) {
    // close dialog on disconnect
    console.log ("Disconnect called with completed status " + completed);

    if (completed) {
      ftpSettings.lastSyncDate = new Date().getTime();
      saveSettings();
    }
    
    Dialogs.cancelModalDialogIfOpen("ftp-dialog");
    
  }
  
  // general event handler of node-side events
  function handleEvent(event, msg) {

    var $dlg = $(".ftp-dialog.instance");

	if (event.type == "ftpsync:error") {
      // remove spinner if active
      $dlg.find(".spinner").removeClass("spin");
      if (msg.slice(0,22) === 'Authentication failure')
        msg = 'Authentication failure';
      $dlg.find("#status").html(msg.slice(0,61));
      inProcess = false;
      return;
    }

    if (event.type == "ftpsync:connected") {
      //start spinner
      $dlg.find(".spinner").addClass("spin");
    } else if (event.type == "ftpsync:disconnected") {
      //stop spinner
      $dlg.find(".spinner").removeClass("spin");
      inProcess = false;
    }
    
    if (msg) { // ignore when msg undefined
      var $status = $dlg.find("#status");
      msg.split('\n').forEach(function (line) {
        if (line.length > 61) {
          line = line.substr(0,61) + "..";
        }
        $status.html(line);
      });
    }
  }


  // show the ftp dialog and get references    
  function showFtpDialog() {

    // we read settings on dialog box creation as the user
    // may flip between projects
    readSettings(function() {
      
      var templateVars = {
          host: ftpSettings.host,
          port: ftpSettings.port,
          user: ftpSettings.user,
          privateKeyFile: ftpSettings.privateKeyFile,
          pwd: ftpSettings.pwd,
          savepwd: ftpSettings.savepwd,
          remoteroot: ftpSettings.remoteRoot,
          Strings: Strings
      };

      Dialogs.showModalDialogUsingTemplate(Mustache.render(mainDialog, templateVars), false);

      // set dropdown, focus to host input and add button handlers
      var $dlg = $(".ftp-dialog.instance");

      $dlg.find('#ftpselect').val(ftpSettings.connect);
      if (ftpSettings.connect === 'SFTP') $dlg.find(".keyfile-group").show();

      $dlg.find("#host").focus();
      $dlg.find(".dialog-button[data-button-id='ok']").on("click", handleOk);
      $dlg.find(".dialog-button[data-button-id='cancel']").on("click", handleCancel);
      $dlg.find(".dialog-button[data-button-id='browse']").on("click", handleBrowse);
      $dlg.find(".btn-group button").on("click", handleSelect);
      
      if (ftpSettings.connect === 'SFTP') $dlg.find('#sftp-btn').trigger('click');
  
    });
    
    // read document date cache on dialog box creation as the
    // user may flip between projects
  }

  function getDefaultKeyPath() {
    ftpDomain.exec('getDefaultKeyPath', false)
    .done(function (default_keypath) {
      console.log('[ftp-sync] default keyfile dir is ' + default_keypath);
      defaultKeyPath = default_keypath;
    }).fail(function (err) {
      console.error('[ftp-sync] failed to find default keyfile path', err);
    });
  }

  // call node for ftp upload
  function callFtpUpload(localRoot) {
    ftpDomain.exec('ftpUpload', ftpSettings, localRoot)
    .done(function () {
      console.log('[ftp-sync] started ftp upload');
    }).fail(function (err) {
      console.error('[ftp-sync] failed to complete ftp upload:', err);
    });
  }

  // call node for ftp stop
  function callFtpStop() {
    ftpDomain.exec('ftpStop', false)
    .done(function () {
      console.log('[ftp-sync] upload stopped');
    }).fail(function (err) {
      console.error('[ftp-sync] failed to complete ftp stop:', err);
    });
  }



  AppInit.appReady(function () {

    ftpDomain = new NodeDomain("ftpsync", ExtensionUtils.getModulePath(module, "node/ftpDomain"));

    // load stylesheet
    ExtensionUtils.loadStyleSheet(module, "styles/styles.css");

    // add icon to toolbar & listener
    $("#main-toolbar .buttons").append(toolbar);
    $("#toolbar-ftpsync").on("click", function() {
        showFtpDialog();
    });


    // listen for events
    $(ftpDomain.connection).on("ftpsync:connected", handleEvent);
    $(ftpDomain.connection).on("ftpsync:disconnected", handleDisconnect);
    $(ftpDomain.connection).on("ftpsync:uploaded", handleEvent);
    $(ftpDomain.connection).on("ftpsync:chkdir", handleEvent);
    $(ftpDomain.connection).on("ftpsync:mkdir", handleEvent);
    $(ftpDomain.connection).on("ftpsync:error", handleEvent);

    settingsToDefault();
    getDefaultKeyPath();
    
    

//        console.log('binding Ctrl-W');
//        CommandManager.register("ftpsyncdialog", COMMAND_ID, showFtpDialog);
//        KeyBindingManager.addBinding(COMMAND_ID, "Ctrl-W", "mac");
//        KeyBindingManager.addBinding(COMMAND_ID, "Ctrl-W", "win");

  });
        
});
