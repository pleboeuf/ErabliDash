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
    "generation": generationId,
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
      "device": "Device A",
      "shape": "cylinder",
      "orientation": "horizontal",
    }],
    "valves": []
  };
  var dashboard = require('../dashboard.js').Dashboard(config, ws);

  it('should update tank level when receiving water level', function() {
    var msg = makeMessage(1, 1, 1, {
      "eName": "sensor/level",
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

describe('Cylinder tank', function() {
  var Tank = require('../dashboard.js').Tank;
  var tank = new Tank({
    "code": "T1",
    "name": "Tank 1",
    "device": "Device 1",
    "shape": "cylinder",
    "orientation": "horizontal",
    "length": 1000 / Math.PI,
    "diameter": 2000,
    "sensorHeight": 2000,
    "rawValue": 1000
  });
  it('should have a capacity', function() {
    assert.equal(1000, tank.getCapacity());
  });
  it('should be half capacity when half filled', function() {
    assert.equal(500, tank.getFill());
  });
});

describe('U-shaped tank', function() {
  var Tank = require('../dashboard.js').Tank;
  var tank = new Tank({
    "code": "T2",
    "name": "Tank 2",
    "device": "Device 2",
    "shape": "u",
    "length": 1000 / Math.PI,
    "diameter": 2000,
    "totalHeight": 1000 + 1000 * Math.PI,
    "sensorHeight": 2000,
    "rawValue": 1000
  });
  it('should have a capacity', function() {
    assert.equal(2500, tank.getCapacity());
  });
  it('should be empty when raw value equals to sensor height', function() {
    tank.rawValue = tank.sensorHeight;
    assert.equal(0, tank.getFill());
  });
  it('should be full when raw value equals sensor height minus total height', function() {
    tank.rawValue = tank.sensorHeight - tank.totalHeight;
    assert.equal(tank.getCapacity(), tank.getFill());
  });
  it('should have expected capacity', function() {
    tank.sensorHeight = 1130;
    tank.totalHeight = 1067;
    tank.diameter = 1219;
    tank.length = 3657;
    assert.equal(4174, Math.ceil(tank.getCapacity()));
  });
});

describe('Dashboard with valve', function() {
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
    "tanks": [],
    "valves": [{
      "code": "V1",
      "device": "Device A",
      "identifier": 1
    }]
  };
  var dashboard = require('../dashboard.js').Dashboard(config, ws);
  it('should have undefined position at the beginning', function() {
    return dashboard.init().then(function(connection) {
      var valve = dashboard.getValve("V1");
      assert.equal(undefined, valve.position);
    });
  });
  it('should have a closed position after a close event', function() {
    var msg = makeMessage(1, 1, 1, {
      "eName": "sensor/closeSensorV1",
      "eData": 0,
    });
    return dashboard.init().then(function(connection) {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msg).then(function() {
          var valve = dashboard.getValve("V1");
          assert.equal(0, valve.position);
        });
      });
    });
  });
});

describe('Dashboard with vacuum sensor', function() {
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
    "tanks": [],
    "valves": [],
    "vacuum": {
      "code": "V1",
      "device": "Device A"
    }
  };
  var dashboard = require('../dashboard.js').Dashboard(config, ws);
  it('should have a value after an event', function() {
    var msg = makeMessage(1, 1, 1, {
      "eName": "sensor/vacuum",
      "eData": 100,
    });
    return dashboard.init().then(function(connection) {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msg).then(function() {
          var valve = dashboard.getVacuumSensorOfDevice("Device A");
          assert.equal(0, valve.position);
        });
      });
    });
  });
});
