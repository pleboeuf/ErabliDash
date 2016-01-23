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

function makeMessage(deviceId, generationId, serialNo, optionalData) {
  if (typeof optionalData === 'undefined') {
    optionalData = {};
  }
  var data = {
    "eGenTS": generationId,
    "noSerie": serialNo
  };
  for (var attrname in optionalData) {
    data[attrname] = optionalData[attrname];
  }
  var message = {
    "coreid": deviceId,
    "published_at": "2016-01-21T05:16:13.149Z",
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
  var config = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": "/tmp/dashboard.json"
    }
  };

  it('should store new device received', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.connect().then(function(connection) {
      return connection.fakeReceive(makeMessage(2, 1, 1)).then(function() {
        return dashboard.getDevice(2).then(function(device) {
          assert.equal(1, device.lastEventSerial);
          assert.equal(1, dashboard.getEventsSinceStore());
        });
      });
    });
  });

  it('should update serial of device when receiving new event', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.connect().then(function(connection) {
      return connection.fakeReceive(makeMessage(20, 1, 1)).then(function() {
        return connection.fakeReceive(makeMessage(20, 1, 2)).then(function() {
          return dashboard.getDevice(20).then(function(device) {
            assert.equal(2, device.lastEventSerial);
            assert.equal(2, dashboard.getEventsSinceStore());
          });
        });
      });
    });
  });

  it('should update serial after requesting updates', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.connect().then(function(connection) {
      return dashboard.update().then(function() {
        return connection.fakeReceive(makeMessage(1, 1, 2)).then(function() {
          return dashboard.getDevice(1).then(function(device) {
            assert.equal(2, device.lastEventSerial);
          });
        });
      });
    });
  });

  it('should ignore event with old serial number', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.connect().then(function(connection) {
      return connection.fakeReceive(makeMessage(1, 1, 2)).then(function() {
        return connection.fakeReceive(makeMessage(1, 1, 1)).then(function() {
          return dashboard.getDevice(1).then(function(device) {
            assert.equal(2, device.lastEventSerial);
          });
        });
      });
    });
  });

  it('should update generation ID when receiving greater ID', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.connect().then(function(connection) {
      return connection.fakeReceive(makeMessage(1, 1, 2)).then(function() {
        return connection.fakeReceive(makeMessage(1, 2, 1)).then(function() {
          return dashboard.getDevice(1).then(function(device) {
            assert.equal(2, device.generationId);
            assert.equal(1, device.lastEventSerial);
          });
        });
      });
    });
  });

  it('should ignore generation ID when receiving lower ID', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.connect().then(function(connection) {
      return connection.fakeReceive(makeMessage(1, 1, 2)).then(function() {
        return connection.fakeReceive(makeMessage(1, 2, 1)).then(function() {
          return dashboard.getDevice(1).then(function(device) {
            assert.equal(2, device.generationId);
          });
        });
      });
    });
  });
});

describe('Dashboard with tank A', function() {
  var ws = makeWsClient();
  var config = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": "/tmp/dashboard.json"
    },
    "devices": [{
      "id": "1",
      "name": "Device A"
    }],
    "tanks": [{
      "name": "Tank A",
      "deviceName": "Device A"
    }]
  };
  var dashboard = require('../dashboard.js').Dashboard(config, ws);

  it('should update tank level when receiving water level', function() {
    var msg = makeMessage(1, 1, 1, {
      "eName": "brunelle/prod/sonde/US100/Distance",
      "eData": 444,
    });
    return dashboard.init().then(function(connection) {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msg).then(function() {
          var tank = dashboard.getTank("Tank A");
          assert.equal(444, tank.rawValue);
          assert.equal("2016-01-21T05:16:13.149Z", tank.lastUpdatedAt);
        });
      });
    });
  });

});
