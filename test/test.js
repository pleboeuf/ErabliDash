var assert = require("assert");

function makeWsClient() {
  var callbacks = {};
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

describe('Dashboard', function() {
  var ws = makeWsClient();
  var dashboard = require('../dashboard.js').Dashboard('ws://localhost/', ws);

  it('should store new device received', function() {
    return dashboard.connect().then(function(connection) {
      return connection.fakeReceive(makeMessage(2, 1)).then(function() {
        return dashboard.getDevice(2).then(function(device) {
          assert.equal(1, device.lastEventSerial);
        });
      });
    });
  });

  it('should update serial of device when receiving new event', function() {
    return dashboard.connect().then(function(connection) {
      return connection.fakeReceive(makeMessage(20, 1)).then(function() {
        return connection.fakeReceive(makeMessage(20, 2)).then(function() {
          return dashboard.getDevice(20).then(function(device) {
            assert.equal(2, device.lastEventSerial);
          });
        });
      });
    });
  });

  it('should update serial after requesting updates', function() {
    return dashboard.connect().then(function(connection) {
      return dashboard.update().then(function() {
        return connection.fakeReceive(makeMessage(1, 2)).then(function() {
          return dashboard.getDevice(1).then(function(device) {
            assert.equal(2, device.lastEventSerial);
          });
        });
      });
    });
  });

});
