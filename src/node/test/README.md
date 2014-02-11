Test code for the node-side of FTP-Sync

Requires mocha

  npm install -g mocha
  
Requires rimraf

  npm install
  
To test:

  - edit FTP parameters in test.js
  - mocha (should find test.js and run through tests)
  
core.js is the node-specfic code contained within ftpDomain.js. As the Brackets code is just message passing,
most of the complexity lives here. test.js brings in core.js and runs a series of tests.

Testing works with the local OS X FTP server (but should work with any local FTP server). Each test consists of
running FTP-Sync and then checking the state of the local directory that maps to the specified REMOTEROOT