## ftp-test-server

ftp-test-server is a very simple  wrapper for pyftpdlib that provides the user with a ready-to-use
FTP server for testing and experiments.

## Usage

```javascript
var Server = require('ftp-test-server');

var myFtp = new Server();

myFtp.on('stdout', function(data) {
  console.log(data);
});

myFtp.on('stderr', function(data) {
  console.log('ERROR', data);
})

myFtp.init({
  user: "sergi",
  pass: "1234",
  port: "3334"
});
```
