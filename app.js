var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('dashboard.sqlite3');
var uri = 'ws://localhost:8150/';
var WebSocketClient = require('websocket').client;
var dashboard = require('./dashboard.js').Dashboard(db, uri, WebSocketClient);
dashboard.connect();
