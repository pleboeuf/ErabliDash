var uri = 'ws://localhost:8150/';
var WebSocketClient = require('websocket').client;
var dashboard = require('./dashboard.js').Dashboard(uri, WebSocketClient);
dashboard.connect().then(function() {
  dashboard.update();
});
