var Server = require("./index.js");

var myFtp = new Server();

myFtp.init({
  user: "sergi",
  pass: "1234",
  port: "3334"
});
