# An FTP/SFTP client for Adobe Brackets


## FTP-Sync is no longer under active development.
Thankyou all for the feedback and use of FTP-Sync. FTP-Sync was a personal project of mine to see what was involved in writing an FTP/SFTP client in 100% Javascript and indeed, after quite a bit of thought and experimentation, it was possible. It was a learning step for me in becoming a full-time Javascript developer.

However for the last few months I simply don't have the personal bandwidth to maintain it, nor am I using FTP myself. If you are using FTP in your project workflow, I *strongly* urge you to look at new tools (e.g. version control workflows). FTP is a last century protocol and does awful things like clear-text password transmission. Using simple version control to push project changes and then deploy from a tagged release is a far far superior code/text/config/whatever deployment mechanism. And one day, when you make a silly mistake, it will save you hours of rework as the complete change history is there.

This repo will remain here in perpetuity so feel free to fork/copy it but there will be no more active development. I will leave the issues open in the event that interested parties wish to communicate.

Tim Burgess




FTP-Sync provides a simple straightforward means of synchronizing your project changes in Brackets with a remote FTP or SFTP server

####Install####
It is available via the Brackets Extension Registry so for the latest version, simply click on the Extension Manager icon in Brackets to install/update to the latest version.

At present, FTP-Sync requires Brackets version 34 or later (due to the new FileSystem API).

If you want to install the extension manually, the root level of this project contains a zip file. This zip file can be dropped and then expanded into either the Brackets extensions folder or `/brackets/src/extensions/dev` if working with the Brackets source.


####Using####

To use FTP-Sync, click on the toolbar icon (a box with an up arrow in it). It will launch a dialog box which prompts you for the FTP/SFTP hostname (server name or IP address both work), username, password and the directory on the remote server where you want to push your project root to - known as the *remote root*. The remote project root directory should already exist.

Click on Upload and then FTP-Sync will look over your currently loaded Brackets project and upload any file that doesn't exist (or does exist but with a different size) to the FTP/SFTP server. FTP-Sync will create all your project subdirectories if they don't already exist and will essentially duplicate your project on the remote server. You can sit back and watch while it does all the hard work.

And if you want to see every single operation that FTP-Sync does, it reports everything to the console for you.


#### Troubleshooting ####

Got an issue? Check the [Troubleshooting](https://github.com/timburgess/brackets-ftp-sync/wiki/Troubleshooting-FTP-Sync) page 

#### Test framework ####

A test framework using _mocha_ is now present in [src/node/test](https://github.com/timburgess/brackets-ftp-sync/tree/master/src/node/test) 

####History####
2015-5-29: 2.0.4 Release

Upgraded jsftp dependency to 1.5.2
Upgraded ssh2 dependency to 0.3.6
Resolves missing 'event-stream' issue

2015-3-30: 2.0.3 Release

Fixed icon being larger than standard - contributed by revxx14.
Fixed css conflicting with other extensions - contributed by Adam Jowett

2015-1-10: 2.0.2 Release

Fix 2.0.1 build issue not incorporating ssh2

2014-12-23: 2.0.1 Release

Changes to work with Brackets 1.1 API - contributed by ckip

2014-08-08: 2.0.0 Release

SFTP functionality now available. Supports password and key-based authentication.

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

