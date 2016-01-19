var deviceRowInDb = {
  "device_id": "1",
  "last_serial_no": 10
};

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
      callback.call(this, null, [deviceRowInDb]);
    }
  };
}

function makeWsClient(callbacks, onConnect) {
  return function() {
    var client = {
      "connection": this,
      "connected": false,
      "on": function(event, callback) {
        console.log("[test] Got callback for '" + event + "'");
        callbacks[event] = callback;
      },
      "connect": function() {
        this.connected = true;
        callbacks['connect'].call(client, client);
        onConnect(client, client);
      },
      "sendUTF": function(message) {
        console.log("Sending: " + message);
      },
      "fakeReceive": function(message) {
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
    client.fakeReceive(makeMessage(2));
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
    client.fakeReceive(makeMessage(10, 1)).then(function() {
      client.fakeReceive(makeMessage(10, 1));
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
    client.fakeReceive(makeMessage(20, 1)).then(function() {
      client.fakeReceive(makeMessage(20, 2));
    });
  });
  var dashboard = require('../dashboard.js').Dashboard(db, 'ws://localhost/', ws);
  dashboard.connect();
  this.on('exit', function() {
    assert.equal(db.runs.length, 2);
  });
};

exports['dashboard.update() receives events'] = function(beforeExit, assert) {
  var db = makeDb();
  var callbacks = {};
  var ws = makeWsClient(callbacks, function(client, connection) {});
  var dashboard = require('../dashboard.js').Dashboard(db, 'ws://localhost/', ws);
  dashboard.connect().then(function(connection) {
    dashboard.update().then(function() {
      connection.fakeReceive(makeMessage(deviceRowInDb.device_id, deviceRowInDb.last_serial_no + 1));
    });
  });
  this.on('exit', function() {
    assert.equal(db.runs.length, 1);
  });
};
