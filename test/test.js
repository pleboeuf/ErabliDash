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

describe('Pump with one cycle', function() {
  var Pump = require('../dashboard.js').Pump;
  var pump = new Pump();
  var event = {
    "generationId": 1,
    "serialNo": 1,
    "data": {
      "eData": 1,
      "timer": 0
    }
  };

  // T0
  pump.update(event);

  // T1
  event.serialNo = event.serialNo + 1;
  event.data.eData = 0;
  event.data.timer = 1000 * 4;
  pump.update(event);

  // T2
  event.serialNo = event.serialNo + 1;
  event.data.eData = 1;
  event.data.timer += 1000 * 1;
  pump.update(event);

  it('should be OFF', function() {
    assert.equal(0, pump.state);
  });

  it('should have 1/5 duty cycle', function() {
    assert.equal(1 / 5, pump.dutyCycle);
  });
});

describe('Dashboard with Datacer Tank', function() {
  var ws = makeWsClient();
  var config = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": "/tmp/dashboard.json"
    },
    "devices": [{
      "id": "DATACER-TANK-001",
      "name": "Datacer Tank Device"
    }],
    "tanks": [{
      "code": "T1",
      "name": "Tank T1",
      "device": "Datacer Tank Device",
      "shape": "cylinder",
      "orientation": "horizontal",
    }],
    "valves": [],
    "vacuums": [],
    "pumps": [],
    "osmose": []
  };

  function makeDatacerTankMessage(deviceId, generationId, serialNo, tankData) {
    var data = {
      "generation": generationId,
      "noSerie": serialNo,
      "eName": "Tank/Level",
      "name": tankData.name,
      "rawValue": tankData.rawValue,
      "depth": tankData.depth,
      "capacity": tankData.capacity,
      "fill": tankData.fill,
      "lastUpdatedAt": tankData.lastUpdatedAt
    };
    var message = {
      "coreid": deviceId,
      "published_at": "2026-02-10T18:00:00.000Z",
      "data": JSON.stringify(data)
    };
    return {
      "type": 'utf8',
      "utf8Data": JSON.stringify(message)
    };
  }

  it('should update tank level when receiving Tank/Level event', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var msg = makeDatacerTankMessage("DATACER-TANK-001", 1, 1, {
      "name": "T1",
      "rawValue": 550,
      "depth": 450,
      "capacity": 1000,
      "fill": 450,
      "lastUpdatedAt": "2026-02-10T18:00:00.000Z"
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msg).then(function() {
          var tank = dashboard.getTank("Tank T1");
          assert.equal(550, tank.rawValue);
          assert.equal(450, tank.depth);
          assert.equal(1000, tank.capacity);
          assert.equal(450, tank.fill);
          assert.equal("2026-02-10T18:00:00.000Z", tank.lastUpdatedAt);
        });
      });
    });
  });

  it('should handle Tank/Level event for tank not in config without error', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var msg = makeDatacerTankMessage("DATACER-TANK-001", 1, 2, {
      "name": "UNKNOWN_TANK",
      "rawValue": 100,
      "depth": 200,
      "capacity": 500,
      "fill": 200,
      "lastUpdatedAt": "2026-02-10T18:05:00.000Z"
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        // Should not throw an error
        return connection.fakeReceive(msg).then(function() {
          // Tank T1 should remain unchanged
          var tank = dashboard.getTank("Tank T1");
          assert.ok(tank, "Original tank should still exist");
        });
      });
    });
  });
});

describe('Dashboard with Datacer Water meter', function() {
  var ws = makeWsClient();
  var config = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": "/tmp/dashboard.json"
    },
    "devices": [{
      "id": "DATACER-WATER-001",
      "name": "Datacer Water Device"
    }],
    "tanks": [],
    "valves": [],
    "vacuums": [],
    "pumps": [],
    "osmose": []
  };

  function makeDatacerWaterMessage(deviceId, generationId, serialNo, waterData) {
    var data = {
      "generation": generationId,
      "noSerie": serialNo,
      "eName": "Water/Volume",
      "name": waterData.name,
      "volume_since_reset": waterData.volume_since_reset
    };
    var message = {
      "coreid": deviceId,
      "published_at": "2026-02-10T18:00:00.000Z",
      "data": JSON.stringify(data)
    };
    return {
      "type": 'utf8',
      "utf8Data": JSON.stringify(message)
    };
  }

  it('should handle Water/Volume event without error', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var msg = makeDatacerWaterMessage("DATACER-WATER-001", 1, 1, {
      "name": "WaterMeter1",
      "volume_since_reset": 12345.67
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        // Should process without throwing an error
        return connection.fakeReceive(msg).then(function() {
          // Water events are logged but not stored in dashboard state
          assert.ok(true, "Water/Volume event processed successfully");
        });
      });
    });
  });
});

describe('Dashboard with Datacer events from new device', function() {
  var ws = makeWsClient();
  var config = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": "/tmp/dashboard.json"
    },
    "devices": [],  // No devices configured
    "tanks": [],
    "valves": [],
    "vacuums": [],
    "pumps": [],
    "osmose": []
  };

  function makeDatacerMessage(deviceId, eventName, eventData) {
    var data = Object.assign({
      "generation": 1,
      "noSerie": 1,
      "eName": eventName
    }, eventData);
    var message = {
      "coreid": deviceId,
      "published_at": "2026-02-10T18:00:00.000Z",
      "data": JSON.stringify(data)
    };
    return {
      "type": 'utf8',
      "utf8Data": JSON.stringify(message)
    };
  }

  it('should process Tank/Level event from unknown device', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var msg = makeDatacerMessage("NEW-DATACER-DEVICE", "Tank/Level", {
      "name": "T1",
      "device": "New Datacer",
      "rawValue": 100,
      "depth": 200,
      "capacity": 500,
      "fill": 200,
      "lastUpdatedAt": "2026-02-10T18:00:00.000Z"
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        // Should not throw - creates temp device for Datacer events
        return connection.fakeReceive(msg).then(function() {
          assert.ok(true, "Tank/Level from new device processed successfully");
        });
      });
    });
  });

  it('should process Water/Volume event from unknown device', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var msg = makeDatacerMessage("NEW-DATACER-WATER", "Water/Volume", {
      "name": "WaterMeter",
      "device": "New Datacer Water",
      "volume_since_reset": 9999.99
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        // Should not throw - creates temp device for Datacer events
        return connection.fakeReceive(msg).then(function() {
          assert.ok(true, "Water/Volume from new device processed successfully");
        });
      });
    });
  });
});
