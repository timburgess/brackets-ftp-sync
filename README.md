# An FTP client for Adobe Brackets

FTP-Sync provides a simple straightforward means of synchronizing your project changes in Brackets with a remote FTP server

####Install####
It is available via the Brackets Extension Registry so for the latest version, simply click on the Extension Manager icon in Brackets to install/update to the latest version.

At present, FTP-Sync requires Brackets version 34 or later (due to the new FileSystem API).

If you want to install the extension manually, the root level of this project contains a zip file. This zip file can be dropped and then expanded into either the Brackets extensions folder or `/brackets/src/extensions/dev` if working with the Brackets source.

|**Need SFTP? [FTP-Sync Plus](http://tim-burgess.com) provides both SFTP and FTP**|
|---|

####Using####

To use FTP-Sync, click on the toolbar icon (a box with an up arrow in it). It will launch a dialog box which prompts you for the FTP hostname (server name or IP address both work), username, password and the directory on the ftp server where you want to push your project root to - known as the *remote root*. The remote project root directory should already exist.

Click on Upload and then FTP-Sync will look over your currently loaded Brackets project and upload any file that doesn't exist (or does exist but with a different size) to the FTP server. FTP-Sync will create all your project subdirectories if they don't already exist and will essentially duplicate your project on the ftp server. You can sit back and watch while it does all the hard work.

And if you want to see every single operation that FTP-Sync does, it reports everything to the console for you.


Tim Burgess
info@tim-burgess.com

#### Troubleshooting ####

Got an issue? Check the [Troubleshooting](https://github.com/timburgess/brackets-ftp-sync/wiki/Troubleshooting-FTP-Sync) page 

#### Test framework ####

A test framework using _mocha_ is now present in [src/node/test](https://github.com/timburgess/brackets-ftp-sync/tree/master/src/node/test) 

####History####
2014-03-07: 1.0.4 Release

Password checkbox for saving password - contributed by Parcye.
Underlying ftp lib patches added

2014-02-06: 1.0.3 Release

Fixed insidious FTP PUT bugs.
Timeouts, non-existent hosts and other user errors handled much better.

2013-12-14: 1.0.2 Release

FTP dialog values (except password) entered now cached.
Bugfixed long status values impacting dialog layout.
              
2013-12-12: 1.0.1 Release

Tweaks to work with Brackets Sprint 34 FileSystem API changes.

2013-08-01: 1.0.0 Release

Initial release of codebase.

