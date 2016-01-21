var uri = 'ws://localhost:8150/';
var WebSocketClient = require('websocket').client;
var dashboard = require('./dashboard.js').Dashboard(uri, WebSocketClient);
dashboard.init().then(function() {
  return dashboard.connect().then(function() {
    dashboard.start();
    return dashboard.update();
  });
}).catch(function(err) {
  console.error(err);
});
