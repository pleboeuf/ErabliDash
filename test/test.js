function makeDb() {
  return {
    "runs": [],
    "serialize": function(callback) {
      callback.call(this);
    },
    "run": function(sql, params, callback) {
      console.log("run(" + sql + ", " + params + ")");
      this.runs.push([sql, params]);
      callback.call(this, null);
    },
    "all": function(sql, params, callback) {
      console.log("Query: " + sql + " [" + params + "]");
      var row = {
        "device_id": "1",
        "last_serial_no": 10
      };
      callback.call(this, null, [row]);
    }
  };
}

function makeWsClient(callbacks, onConnect) {
  return function() {
    var client = {
      "on": function(event, callback) {
        console.log("[test] Got callback for '" + event + "'");
        callbacks[event] = callback;
      },
      "connect": function() {
        callbacks['connect'].call(client, client);
        onConnect(client, client);
      },
      "connection": this,
      "sendMessage": function(message) {
        return callbacks['message'].call(client, message);
      }
    };
    return client;
  };
}

function makeMessage(deviceId, serialNo) {
  var data = {
    "noSerie": serialNo
  };
  var message = {
    "coreid": deviceId,
    "data": JSON.stringify(data)
  };
  var wsMessage = {
    "type": 'utf8',
    "utf8Data": JSON.stringify(message)
  };
  return wsMessage;
}

exports['dashboard.connect() receives new device'] = function(beforeExit, assert) {
  var db = makeDb();
  var callbacks = {};
  var ws = makeWsClient(callbacks, function(client, connection) {
    client.sendMessage(makeMessage(2));
  });
  var dashboard = require('../dashboard.js').Dashboard(db, 'ws://localhost/', ws);
  dashboard.connect();
  this.on('exit', function() {
    assert.equal(db.runs.length, 1);
  });
};

exports['dashboard.connect() receives new device then same serial'] = function(beforeExit, assert) {
  var db = makeDb();
  var callbacks = {};
  var ws = makeWsClient(callbacks, function(client, connection) {
    client.sendMessage(makeMessage(10, 1)).then(function() {
      client.sendMessage(makeMessage(10, 1));
    });
  });
  var dashboard = require('../dashboard.js').Dashboard(db, 'ws://localhost/', ws);
  dashboard.connect();
  this.on('exit', function() {
    assert.equal(db.runs.length, 1);
  });
};

exports['dashboard.connect() receives new device then new serial'] = function(beforeExit, assert) {
  var db = makeDb();
  var callbacks = {};
  var ws = makeWsClient(callbacks, function(client, connection) {
    client.sendMessage(makeMessage(20, 1)).then(function() {
      client.sendMessage(makeMessage(20, 2));
    });
  });
  var dashboard = require('../dashboard.js').Dashboard(db, 'ws://localhost/', ws);
  dashboard.connect();
  this.on('exit', function() {
    assert.equal(db.runs.length, 2);
  });
};
