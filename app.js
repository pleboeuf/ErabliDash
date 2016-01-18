var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();

client.on('connectFailed', function(error) {
  console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
  console.log('WebSocket Client Connected');
  connection.on('error', function(error) {
    console.log("Connection Error: " + error.toString());
  });
  connection.on('close', function() {
    console.log('event-stream Connection Closed');
  });
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      console.log("Received: '" + message.utf8Data + "'");
    }
  });

  function sendQuery() {
    if (connection.connected) {
      connection.sendUTF(JSON.stringify({
        "command": "query",
        "device": "1f003f000747343337373738",
        "after": 9040
      }));
    }
  }
  sendQuery();
});

client.connect('ws://localhost:8150/', 'event-stream');
