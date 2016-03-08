var WebSocketClient = require('websocket').client;
var config = require('./config.json');
var dashboard = require('./dashboard.js').Dashboard(config, WebSocketClient);
dashboard.init().then(function() {
  return dashboard.connect().then(function() {
    dashboard.start();
    return dashboard.update();
  });
}).catch(function(err) {
  console.error("Error stating dashboard: ", err.stack);
});
var express = require('express');
var path = require('path');
var app = express();
app.use(app.router);
app.use(express.logger());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bower_components', express.static(path.join(__dirname, 'bower_components')));
app.use('/', express.static(path.join(__dirname, 'index.html')));
app.get('/data.json', function(req, res) {
  res.setHeader("Content-Type", "text/plain");
  res.send(JSON.stringify(dashboard.getData(), null, 2));
});
var http = require('http');
var port = config.port || '3000';
app.set('port', port);
var server = http.createServer(app);
var WebSocketServer = require('websocket').server;
var wsServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false
});
var connectedClients = [];
function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}
function publishData(connection) {
  connection.sendUTF(JSON.stringify(dashboard.getData()));
}
wsServer.on('request', function(request) {
  try {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    var connection = request.accept('dashboard-stream', request.origin);
    connectedClients.push(connection);
    console.log((new Date()) + ' Connection accepted from ' + connection.remoteAddress + '. Connections: ' + connectedClients.length);
    connection.on('message', function(message) {
      if (message.type === 'utf8') {
        console.log('Dropping message: ' + message.utf8Data);
      }
    });
    connection.on('close', function(reasonCode, description) {
      connectedClients.splice(connectedClients.indexOf(connection), 1);
      console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected. Connections: ' + connectedClients.length);
    });
    publishData(connection);
  } catch (exception) {
    console.error(exception);
  }
});
dashboard.onChange(function() {
  connectedClients.forEach(function(connection) {
    publishData(connection);
  });
});
server.listen(port);
console.log('HTTP Server started: http://localhost:' + port);
