####Test framework for the node-side of FTP-Sync####

core.js is the node-specfic code contained within ftpDomain.js. As the Brackets code is just message passing,
most of the complexity lives here. test.js brings in core.js and runs a series of tests.

TODO: migrate code.js to node dir and have ftpDomain.js require('./code.js)

Testing works with the inbuilt OS X FTP server (but should work with any local FTP server). Each test consists of
running FTP-Sync and then checking the state of the local directory that maps to the specified REMOTEROOT


To setup, in the test directory:

1. Install mocha globally

  npm install -g mocha
  
2. Install rimraf

  npm install
  
3. Copy config.json.example to config.json and add your localhost FTP user and pwd
   Also, set localprefix to the local directory where your FTP server places you on login
  
To test, simply run `mocha` on the command-line. Mocha should find test.js and run
through the tests


`mocha --debug-brk` will allow debugging via node-inspector
  
