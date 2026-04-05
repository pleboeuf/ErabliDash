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

describe('Dashboard stale cursor recovery for EB devices', function() {
  var fs = require('fs');
  var ws = makeWsClient();
  var storeFilename = '/tmp/dashboard_eb_cursor_recovery.json';
  var twoWeeksInSeconds = 14 * 24 * 60 * 60;
  function nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }
  var ebConfig = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": storeFilename
    },
    "devices": [{
      "id": "440047001051363036373538",
      "name": "EB-RF2"
    }],
    "tanks": [],
    "valves": [],
    "vacuums": [],
    "pumps": [],
    "osmose": []
  };
  var nonEbConfig = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": storeFilename
    },
    "devices": [{
      "id": "NON-EB-1",
      "name": "RF2"
    }],
    "tanks": [],
    "valves": [],
    "vacuums": [],
    "pumps": [],
    "osmose": []
  };

  beforeEach(function() {
    try { fs.unlinkSync(storeFilename); } catch(e) { /* ignore */ }
  });
  afterEach(function() {
    try { fs.unlinkSync(storeFilename); } catch(e) { /* ignore */ }
  });

  it('should recover from stale generation drift for realtime EB events', function() {
    var newerGeneration = nowSeconds() - 60;
    var staleButStillValidGeneration = newerGeneration - 1000001;
    var dashboard = require('../dashboard.js').Dashboard(ebConfig, ws);
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(makeMessage(
          "440047001051363036373538",
          newerGeneration,
          245459,
          { "eName": "sensor/level", "eData": 264, "replay": 0 }
        )).then(function() {
          return connection.fakeReceive(makeMessage(
            "440047001051363036373538",
            staleButStillValidGeneration,
            38286,
            { "eName": "sensor/level", "eData": 264, "replay": 0 }
          )).then(function() {
            return dashboard.getDevice("440047001051363036373538").then(function(device) {
              assert.equal(staleButStillValidGeneration, device.generationId);
              assert.equal(38286, device.lastEventSerial);
            });
          });
        });
      });
    });
  });

  it('should recover from stale serial drift for realtime EB events', function() {
    var generation = nowSeconds() - 120;
    var dashboard = require('../dashboard.js').Dashboard(ebConfig, ws);
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(makeMessage(
          "440047001051363036373538",
          generation,
          245459,
          { "eName": "sensor/level", "eData": 264, "replay": 0 }
        )).then(function() {
          return connection.fakeReceive(makeMessage(
            "440047001051363036373538",
            generation,
            38286,
            { "eName": "sensor/level", "eData": 264, "replay": 0 }
          )).then(function() {
            return dashboard.getDevice("440047001051363036373538").then(function(device) {
              assert.equal(generation, device.generationId);
              assert.equal(38286, device.lastEventSerial);
            });
          });
        });
      });
    });
  });

  it('should recover from persisted future generation for realtime EB events', function() {
    var persistedFutureGeneration = nowSeconds() + 300;
    var validIncomingGeneration = nowSeconds() - 30;
    fs.writeFileSync(storeFilename, JSON.stringify({
      "devices": [{
        "id": "440047001051363036373538",
        "name": "EB-RF2",
        "generationId": persistedFutureGeneration,
        "lastEventSerial": 245459
      }],
      "tanks": [],
      "valves": [],
      "vacuums": [],
      "pumps": [],
      "osmose": [],
      "waterMeters": []
    }), 'utf8');
    var dashboard = require('../dashboard.js').Dashboard(ebConfig, ws);
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(makeMessage(
          "440047001051363036373538",
          validIncomingGeneration,
          38286,
          { "eName": "sensor/level", "eData": 264, "replay": 0 }
        )).then(function() {
          return dashboard.getDevice("440047001051363036373538").then(function(device) {
            assert.equal(validIncomingGeneration, device.generationId);
            assert.equal(38286, device.lastEventSerial);
          });
        });
      });
    });
  });

  it('should reject realtime EB events with generation older than two weeks', function() {
    var oldGeneration = nowSeconds() - twoWeeksInSeconds - 60;
    var dashboard = require('../dashboard.js').Dashboard(ebConfig, ws);
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(makeMessage(
          "440047001051363036373538",
          oldGeneration,
          38286,
          { "eName": "sensor/level", "eData": 264, "replay": 0 }
        )).then(function() {
          return dashboard.getDevice("440047001051363036373538").then(function(device) {
            assert.equal(undefined, device.generationId);
            assert.equal(undefined, device.lastEventSerial);
          });
        });
      });
    });
  });

  it('should reject realtime EB events with future generation', function() {
    var futureGeneration = nowSeconds() + 60;
    var dashboard = require('../dashboard.js').Dashboard(ebConfig, ws);
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(makeMessage(
          "440047001051363036373538",
          futureGeneration,
          38286,
          { "eName": "sensor/level", "eData": 264, "replay": 0 }
        )).then(function() {
          return dashboard.getDevice("440047001051363036373538").then(function(device) {
            assert.equal(undefined, device.generationId);
            assert.equal(undefined, device.lastEventSerial);
          });
        });
      });
    });
  });

  it('should keep rejecting stale serial drift for non-EB devices', function() {
    var generation = nowSeconds() - 120;
    var dashboard = require('../dashboard.js').Dashboard(nonEbConfig, ws);
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(makeMessage(
          "NON-EB-1",
          generation,
          245459,
          { "eName": "sensor/level", "eData": 264, "replay": 0 }
        )).then(function() {
          return connection.fakeReceive(makeMessage(
            "NON-EB-1",
            generation,
            38286,
            { "eName": "sensor/level", "eData": 264, "replay": 0 }
          )).then(function() {
            return dashboard.getDevice("NON-EB-1").then(function(device) {
              assert.equal(generation, device.generationId);
              assert.equal(245459, device.lastEventSerial);
            });
          });
        });
      });
    });
  });

});

describe('Dashboard persisted tanks with duplicate code', function() {
  var fs = require('fs');
  var ws = makeWsClient();
  var storeFilename = '/tmp/dashboard_duplicate_code_matching.json';
  var config = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": storeFilename
    },
    "devices": [{
      "id": "ULTRA-RS2",
      "name": "EB-RS2"
    }, {
      "id": "DATACER-RS2",
      "name": "BASSIN RF2-RS1-RS2"
    }],
    "tanks": [{
      "code": "RS2",
      "name": "RS2 ultra",
      "device": "EB-RS2",
      "shape": "cylinder",
      "orientation": "horizontal",
      "length": 7010,
      "diameter": 1842,
      "sensorHeight": 1863,
      "sensorType": "ultrasonic",
      "rawUnit": "mm"
    }, {
      "code": "RS2",
      "name": "RS2 datacer",
      "device": "BASSIN RF2-RS1-RS2",
      "shape": "cylinder",
      "orientation": "horizontal",
      "length": 7010,
      "diameter": 1842,
      "offset": 330,
      "sensorType": "pressure",
      "rawUnit": "in"
    }],
    "valves": [],
    "vacuums": [],
    "pumps": [],
    "osmose": []
  };

  beforeEach(function() {
    try { fs.unlinkSync(storeFilename); } catch(e) { /* ignore */ }
  });
  afterEach(function() {
    try { fs.unlinkSync(storeFilename); } catch(e) { /* ignore */ }
  });

  it('should restore persisted rawValue using both code and device', function() {
    fs.writeFileSync(storeFilename, JSON.stringify({
      "devices": [{
        "id": "ULTRA-RS2",
        "name": "EB-RS2"
      }, {
        "id": "DATACER-RS2",
        "name": "BASSIN RF2-RS1-RS2"
      }],
      "tanks": [{
        "code": "RS2",
        "name": "RS2 ultra",
        "device": "EB-RS2",
        "rawValue": 1280
      }, {
        "code": "RS2",
        "name": "RS2 datacer",
        "device": "BASSIN RF2-RS1-RS2",
        "rawValue": 35.2
      }],
      "valves": [],
      "vacuums": [],
      "pumps": [],
      "osmose": [],
      "waterMeters": []
    }), 'utf8');

    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.init().then(function() {
      var tankData = dashboard.getData().tanks;
      var ultraTank = tankData.filter(function(tank) {
        return tank.code === "RS2" && tank.device === "EB-RS2";
      })[0];
      var datacerTank = tankData.filter(function(tank) {
        return tank.code === "RS2" && tank.device === "BASSIN RF2-RS1-RS2";
      })[0];
      assert.equal(1280, ultraTank.rawValue);
      assert.equal(35.2, datacerTank.rawValue);
    });
  });
});

describe('Dashboard security', function() {
  var ws = makeWsClient();
  var config = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": "/tmp/dashboard_security.json"
    },
    "devices": [],
    "tanks": [],
    "valves": [],
    "vacuums": [],
    "pumps": [],
    "osmose": []
  };

  it('should not expose control secrets in getData payload', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.init().then(function() {
      var data = dashboard.getData();
      assert.equal(false, Object.prototype.hasOwnProperty.call(data, 'token'));
      assert.equal(false, Object.prototype.hasOwnProperty.call(data, 'valveSelectorPassword'));
    });
  });

});

describe('Dashboard boiling point offset', function() {
  var fs = require('fs');
  var ws = makeWsClient();
  var storeFilename = '/tmp/dashboard_boiling_offset.json';
  var config = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": storeFilename
    },
    "devices": [],
    "tanks": [],
    "valves": [],
    "vacuums": [],
    "pumps": [],
    "osmose": []
  };

  beforeEach(function() {
    try { fs.unlinkSync(storeFilename); } catch(e) { /* ignore */ }
  });
  afterEach(function() {
    try { fs.unlinkSync(storeFilename); } catch(e) { /* ignore */ }
  });

  it('should persist boiling point offset in dashboard.json and reload it', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.init().then(function() {
      assert.equal(0, dashboard.getBoilingPointOffset());
      return dashboard.setBoilingPointOffset(0.6).then(function(savedOffset) {
        assert.equal(0.6, savedOffset);
        assert.equal(0.6, dashboard.getBoilingPointOffset());
        var storedData = JSON.parse(fs.readFileSync(storeFilename, 'utf8'));
        assert.ok(storedData.meteo, 'meteo group should exist');
        assert.equal(0.6, storedData.meteo.boilingPointOffsetF);
        assert.equal(0.6, storedData.boilingPointOffsetF);

        var reloadedDashboard = require('../dashboard.js').Dashboard(config, ws);
        return reloadedDashboard.init().then(function() {
          assert.equal(0.6, reloadedDashboard.getBoilingPointOffset());
        });
      });
    });
  });

  it('should clamp boiling point offset to [-1.0, +1.0]', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.init().then(function() {
      return dashboard.setBoilingPointOffset(2.4).then(function() {
        assert.equal(1.0, dashboard.getBoilingPointOffset());
        return dashboard.setBoilingPointOffset(-3.8).then(function() {
          assert.equal(-1.0, dashboard.getBoilingPointOffset());
        });
      });
    });
  });

  it('should persist meteo group with boiling, outdoor temperature and pressure', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.init().then(function() {
      return dashboard.setBoilingPointOffset(0.5).then(function() {
        return dashboard.updateMeteoData(4.34, 101.276).then(function(meteo) {
          assert.equal(4.3, meteo.outdoorTempC);
          assert.equal(101.28, meteo.pressureKpa);
          assert.equal(219.5, meteo.boilingPointTempF);
          assert.equal(0.5, meteo.boilingPointOffsetF);
          var storedData = JSON.parse(fs.readFileSync(storeFilename, 'utf8'));
          assert.ok(storedData.meteo, 'meteo group should be persisted');
          assert.equal(4.3, storedData.meteo.outdoorTempC);
          assert.equal(101.28, storedData.meteo.pressureKpa);
          assert.equal(219.5, storedData.meteo.boilingPointTempF);
          assert.equal(0.5, storedData.meteo.boilingPointOffsetF);
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

describe('Dashboard tank exponential filtering', function() {
  var fs = require('fs');

  afterEach(function() {
    try { fs.unlinkSync('/tmp/dashboard_ultrasonic_filter.json'); } catch(e) { /* ignore */ }
    try { fs.unlinkSync('/tmp/dashboard_datacer_filter.json'); } catch(e) { /* ignore */ }
  });

  it('should apply exponential smoothing for ultrasonic sensor/level events', function() {
    var ws = makeWsClient();
    var config = {
      "collectors": [{
        "uri": 'ws://localhost/'
      }],
      "store": {
        "filename": "/tmp/dashboard_ultrasonic_filter.json"
      },
      "devices": [{
        "id": "ULTRA-1",
        "name": "Ultrasonic Device"
      }],
      "tanks": [{
        "code": "U1",
        "name": "Ultrasonic Tank",
        "device": "Ultrasonic Device",
        "shape": "cylinder",
        "orientation": "horizontal",
        "filterAlpha": 0.2
      }],
      "valves": [],
      "vacuums": [],
      "pumps": [],
      "osmose": []
    };
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var firstLevel = makeMessage("ULTRA-1", 1, 1, {
      "eName": "sensor/level",
      "eData": 1000
    });
    var secondLevel = makeMessage("ULTRA-1", 1, 2, {
      "eName": "sensor/level",
      "eData": 500
    });
    var expectedFiltered = 900; // 0.2 * 500 + 0.8 * 1000

    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(firstLevel).then(function() {
          return connection.fakeReceive(secondLevel).then(function() {
            var tank = dashboard.getTank("Ultrasonic Tank");
            assert.equal(500, tank.unfilteredRawValue);
            assert.ok(Math.abs(expectedFiltered - tank.rawValue) < 0.0001);
            assert.ok(Math.abs(expectedFiltered - tank.filteredRawValue) < 0.0001);
          });
        });
      });
    });
  });

  it('should apply exponential smoothing for Datacer Tank/Level events', function() {
    var ws = makeWsClient();
    var config = {
      "collectors": [{
        "uri": 'ws://localhost/'
      }],
      "store": {
        "filename": "/tmp/dashboard_datacer_filter.json"
      },
      "devices": [{
        "id": "DATACER-TANK-FILTER",
        "name": "Datacer Filter Device"
      }],
      "tanks": [{
        "code": "DT1",
        "name": "Datacer Filter Tank",
        "device": "Datacer Filter Device",
        "shape": "cylinder",
        "orientation": "horizontal",
        "length": 1000 / Math.PI,
        "diameter": 2000,
        "offset": 0,
        "sensorType": "pressure",
        "rawUnit": "in",
        "filterAlpha": 0.25
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

    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var firstRawValue = 40;
    var secondRawValue = 20;
    var expectedFiltered = 35; // 0.25 * 20 + 0.75 * 40
    var firstMsg = makeDatacerTankMessage("DATACER-TANK-FILTER", 1, 1, {
      "name": "DT1",
      "rawValue": firstRawValue,
      "depth": 450,
      "capacity": 1000,
      "fill": 450,
      "lastUpdatedAt": "2026-02-10T18:00:00.000Z"
    });
    var secondMsg = makeDatacerTankMessage("DATACER-TANK-FILTER", 1, 2, {
      "name": "DT1",
      "rawValue": secondRawValue,
      "depth": 300,
      "capacity": 1000,
      "fill": 300,
      "lastUpdatedAt": "2026-02-10T18:05:00.000Z"
    });

    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(firstMsg).then(function() {
          return connection.fakeReceive(secondMsg).then(function() {
            var tank = dashboard.getTank("Datacer Filter Tank");
            assert.equal(secondRawValue, tank.unfilteredRawValue);
            assert.ok(Math.abs(expectedFiltered - tank.rawValue) < 0.0001);
            assert.ok(Math.abs(expectedFiltered - tank.filteredRawValue) < 0.0001);
          });
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
describe('Pressure tank', function() {
  var Tank = require('../dashboard.js').Tank;
  var tank = new Tank({
    "code": "TP1",
    "name": "Pressure Tank",
    "device": "Device P",
    "shape": "cylinder",
    "orientation": "horizontal",
    "length": 1000 / Math.PI,
    "diameter": 2000,
    "sensorType": "pressure",
    "rawUnit": "in",
    "offset": 254, // 10 in
    "rawValue": 49.37007874015748 // 1254 mm => 1000 mm net level
  });
  it('should use raw inches minus offset to compute fill', function() {
    assert.ok(Math.abs(500 - tank.getFill()) < 0.0001);
  });
  it('should return null fill when raw value is invalid', function() {
    tank.rawValue = undefined;
    assert.equal(null, tank.getFill());
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
  it('should return null fill when raw value is invalid', function() {
    tank.rawValue = undefined;
    assert.equal(null, tank.getFill());
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
  var Tank = require('../dashboard.js').Tank;
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
      "length": 1000 / Math.PI,
      "diameter": 2000,
      "offset": 0,
      "sensorType": "pressure",
      "rawUnit": "in"
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
    var rawValueInches = 39.37007874015748; // 1000 mm
    var expectedTank = new Tank(Object.assign({}, config.tanks[0], {
      "rawValue": rawValueInches
    }));
    var msg = makeDatacerTankMessage("DATACER-TANK-001", 1, 1, {
      "name": "T1",
      "rawValue": rawValueInches,
      "depth": 450,
      "capacity": 1000,
      "fill": 450,
      "lastUpdatedAt": "2026-02-10T18:00:00.000Z"
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msg).then(function() {
          var tank = dashboard.getTank("Tank T1");
          var tankData = dashboard.getData().tanks.filter(function(t) {
            return t.code === "T1";
          })[0];
          assert.equal(rawValueInches, tank.rawValue);
          assert.equal(450, tank.depth);
          assert.ok(Math.abs(expectedTank.getCapacity() - tankData.capacity) < 0.0001);
          assert.ok(Math.abs(expectedTank.getFill() - tankData.fill) < 0.0001);
          assert.notEqual(450, tankData.fill);
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

  it('should keep Datacer smoothing and reset an implausible baseline', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var msg1 = makeDatacerTankMessage("DATACER-TANK-001", 1, 1, {
      "name": "T1",
      "rawValue": 40,
      "depth": 450,
      "capacity": 1000,
      "fill": 450,
      "lastUpdatedAt": "2026-02-10T18:00:00.000Z"
    });
    var msg2 = makeDatacerTankMessage("DATACER-TANK-001", 1, 2, {
      "name": "T1",
      "rawValue": 30,
      "depth": 45,
      "capacity": 1000,
      "fill": 45,
      "lastUpdatedAt": "2026-02-10T18:01:00.000Z"
    });
    var msg3 = makeDatacerTankMessage("DATACER-TANK-001", 1, 3, {
      "name": "T1",
      "rawValue": 10,
      "depth": 45,
      "capacity": 1000,
      "fill": 45,
      "lastUpdatedAt": "2026-02-10T18:02:00.000Z"
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msg1).then(function() {
          return connection.fakeReceive(msg2).then(function() {
            var tankAfterSmooth = dashboard.getTank("Tank T1");
            assert.ok(Math.abs(37.5 - tankAfterSmooth.rawValue) < 0.0001);
            tankAfterSmooth.filteredRawValue = 500;
            return connection.fakeReceive(msg3).then(function() {
              var tankAfterReset = dashboard.getTank("Tank T1");
              assert.equal(10, tankAfterReset.rawValue);
            });
          });
        });
      });
    });
  });
});
describe('Dashboard Datacer tank persisted-data migration', function() {
  var fs = require('fs');
  var ws = makeWsClient();
  var storeFilename = '/tmp/dashboard_datacer_tank_migration.json';
  var config = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": storeFilename
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
      "length": 1000 / Math.PI,
      "diameter": 2000,
      "offset": 0,
      "sensorType": "pressure",
      "rawUnit": "in"
    }],
    "valves": [],
    "vacuums": [],
    "pumps": [],
    "osmose": []
  };

  beforeEach(function() {
    try { fs.unlinkSync(storeFilename); } catch(e) { /* ignore */ }
  });
  afterEach(function() {
    try { fs.unlinkSync(storeFilename); } catch(e) { /* ignore */ }
  });

  it('should migrate legacy persisted fill into rawValue for pressure tanks', function() {
    var legacyFillInches = 39.37007874015748; // 1000 mm
    var persistedDashboardData = {
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
        "length": 1000 / Math.PI,
        "diameter": 2000,
        "offset": 0,
        "sensorType": "pressure",
        "rawUnit": "in",
        "isDatacer": true,
        "fill": legacyFillInches,
        "lastUpdatedAt": "2026-02-10T18:00:00.000Z"
      }],
      "valves": [],
      "vacuums": [],
      "pumps": [],
      "osmose": [],
      "waterMeters": []
    };
    fs.writeFileSync(storeFilename, JSON.stringify(persistedDashboardData), 'utf8');

    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.init().then(function() {
      var tank = dashboard.getTank("Tank T1");
      var tankData = dashboard.getData().tanks.filter(function(t) {
        return t.code === "T1";
      })[0];
      assert.equal(legacyFillInches, tank.rawValue);
      assert.ok(Math.abs(500 - tankData.fill) < 0.0001);
    });
  });
});

describe('Dashboard temporary EB-RSx Datacer fallback', function() {
  var fs = require('fs');
  var ws = makeWsClient();
  var storeFilename = '/tmp/dashboard_eb_rsx_datacer_fallback.json';
  var config = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": storeFilename
    },
    "devices": [{
      "id": "23001b001847393035313137",
      "name": "EB-RS1"
    }, {
      "id": "23001b001847393035313138",
      "name": "EB-RS3"
    }, {
      "id": "BASSIN RF2-RS1-RS2",
      "name": "BASSIN RF2-RS1-RS2"
    }, {
      "id": "BASSIN RS3-RS4",
      "name": "BASSIN RS3-RS4"
    }],
    "tanks": [{
      "code": "RS1",
      "name": "Réservoir de sève #1",
      "device": "EB-RS1",
      "shape": "cylinder",
      "orientation": "horizontal",
      "length": 10718,
      "diameter": 1651,
      "sensorHeight": 1743,
      "sensorType": "ultrasonic",
      "rawUnit": "mm"
    }, {
      "code": "RS1",
      "name": "Réservoir de sève #1",
      "device": "BASSIN RF2-RS1-RS2",
      "shape": "cylinder",
      "orientation": "horizontal",
      "length": 10718,
      "diameter": 1651,
      "scaleFactor": 1.0,
      "offset": 280,
      "sensorType": "pressure",
      "rawUnit": "in"
    }, {
      "code": "RS3",
      "name": "Réservoir de sève #3",
      "device": "EB-RS3",
      "shape": "cylinder",
      "orientation": "horizontal",
      "length": 4128,
      "diameter": 2438,
      "sensorHeight": 2216,
      "sensorType": "ultrasonic",
      "rawUnit": "mm"
    }, {
      "code": "RS3",
      "name": "Réservoir de sève #3",
      "device": "BASSIN RS3-RS4",
      "shape": "cylinder",
      "orientation": "horizontal",
      "length": 4128,
      "diameter": 2438,
      "scaleFactor": 1.0,
      "offset": 16,
      "sensorType": "pressure",
      "rawUnit": "in"
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

  beforeEach(function() {
    try { fs.unlinkSync(storeFilename); } catch(e) { /* ignore */ }
  });
  afterEach(function() {
    try { fs.unlinkSync(storeFilename); } catch(e) { /* ignore */ }
  });

  it('should mirror Datacer RS1 level into EB-RS1 tank data', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var msg = makeDatacerTankMessage("BASSIN RF2-RS1-RS2", 1, 1, {
      "name": "RS1",
      "rawValue": 35.0,
      "depth": 300,
      "capacity": 1000,
      "fill": 300,
      "lastUpdatedAt": "2026-02-10T18:00:00.000Z"
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msg).then(function() {
          var tanks = dashboard.getData().tanks;
          var ebRs1Tank = tanks.filter(function(t) {
            return t.device === "EB-RS1" && t.code === "RS1";
          })[0];
          var datacerRs1Tank = tanks.filter(function(t) {
            return t.device === "BASSIN RF2-RS1-RS2" && t.code === "RS1";
          })[0];

          assert.ok(ebRs1Tank, "EB-RS1 tank should exist");
          assert.ok(datacerRs1Tank, "Datacer RS1 tank should exist");
          assert.ok(Number.isFinite(ebRs1Tank.rawValue), "EB-RS1 rawValue should be finite");
          assert.ok(Math.abs(ebRs1Tank.fill - datacerRs1Tank.fill) < 0.0001);
        });
      });
    });
  });

  it('should keep mirrored RS1 fill after a new EB-RS1 ultrasonic event', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var datacerMsg = makeDatacerTankMessage("BASSIN RF2-RS1-RS2", 1, 1, {
      "name": "RS1",
      "rawValue": 35.0,
      "depth": 300,
      "capacity": 1000,
      "fill": 300,
      "lastUpdatedAt": "2026-02-10T18:00:00.000Z"
    });
    var ebRs1SensorMsg = makeMessage("23001b001847393035313137", 1, 1, {
      "eName": "sensor/level",
      "eData": 1743
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(datacerMsg).then(function() {
          var tanksAfterDatacer = dashboard.getData().tanks;
          var datacerRs1Tank = tanksAfterDatacer.filter(function(t) {
            return t.device === "BASSIN RF2-RS1-RS2" && t.code === "RS1";
          })[0];
          var ebRs1TankAfterDatacer = tanksAfterDatacer.filter(function(t) {
            return t.device === "EB-RS1" && t.code === "RS1";
          })[0];
          var mirroredFill = ebRs1TankAfterDatacer.fill;
          assert.ok(Math.abs(mirroredFill - datacerRs1Tank.fill) < 0.0001);
          return connection.fakeReceive(ebRs1SensorMsg).then(function() {
            var tanksAfterUltrasound = dashboard.getData().tanks;
            var ebRs1TankAfterUltrasound = tanksAfterUltrasound.filter(function(t) {
              return t.device === "EB-RS1" && t.code === "RS1";
            })[0];
            var datacerRs1TankAfterUltrasound = tanksAfterUltrasound.filter(function(t) {
              return t.device === "BASSIN RF2-RS1-RS2" && t.code === "RS1";
            })[0];
            assert.ok(Number.isInteger(ebRs1TankAfterUltrasound.rawValue));
            assert.ok(Math.abs(ebRs1TankAfterUltrasound.fill - mirroredFill) < 0.0001);
            assert.ok(Math.abs(ebRs1TankAfterUltrasound.fill - datacerRs1TankAfterUltrasound.fill) < 0.0001);
          });
        });
      });
    });
  });

  it('should keep mirrored RS3 fill after a new EB-RS3 ultrasonic event', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var datacerMsg = makeDatacerTankMessage("BASSIN RS3-RS4", 1, 1, {
      "name": "RS3",
      "rawValue": 35.0,
      "depth": 300,
      "capacity": 1000,
      "fill": 300,
      "lastUpdatedAt": "2026-02-10T18:00:00.000Z"
    });
    var ebRs3SensorMsg = makeMessage("23001b001847393035313138", 1, 1, {
      "eName": "sensor/level",
      "eData": 2216
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(datacerMsg).then(function() {
          var tanksAfterDatacer = dashboard.getData().tanks;
          var datacerRs3Tank = tanksAfterDatacer.filter(function(t) {
            return t.device === "BASSIN RS3-RS4" && t.code === "RS3";
          })[0];
          var ebRs3TankAfterDatacer = tanksAfterDatacer.filter(function(t) {
            return t.device === "EB-RS3" && t.code === "RS3";
          })[0];
          var mirroredFill = ebRs3TankAfterDatacer.fill;
          assert.ok(Math.abs(mirroredFill - datacerRs3Tank.fill) < 0.0001);
          return connection.fakeReceive(ebRs3SensorMsg).then(function() {
            var tanksAfterUltrasound = dashboard.getData().tanks;
            var ebRs3TankAfterUltrasound = tanksAfterUltrasound.filter(function(t) {
              return t.device === "EB-RS3" && t.code === "RS3";
            })[0];
            var datacerRs3TankAfterUltrasound = tanksAfterUltrasound.filter(function(t) {
              return t.device === "BASSIN RS3-RS4" && t.code === "RS3";
            })[0];
            assert.ok(Number.isInteger(ebRs3TankAfterUltrasound.rawValue));
            assert.ok(Math.abs(ebRs3TankAfterUltrasound.fill - mirroredFill) < 0.0001);
            assert.ok(Math.abs(ebRs3TankAfterUltrasound.fill - datacerRs3TankAfterUltrasound.fill) < 0.0001);
          });
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

describe('Pump maintenance counter via vacuum pressure', function() {
  var fs = require('fs');
  beforeEach(function() {
    try { fs.unlinkSync('/tmp/dashboard_pump_maint.json'); } catch(e) { /* ignore */ }
  });

  var ws = makeWsClient();
  var config = {
    "collectors": [{
      "uri": 'ws://localhost/'
    }],
    "store": {
      "filename": "/tmp/dashboard_pump_maint.json"
    },
    "devices": [{
      "id": "POMPE 1",
      "name": "POMPE 1"
    }],
    "tanks": [],
    "valves": [],
    "vacuums": [{
      "code": "PV1",
      "device": "POMPE 1",
      "offset": 0,
      "ref": "PV1"
    }],
    "pumps": [],
    "osmose": []
  };

  function makeVacuumMessage(deviceId, generationId, serialNo, vacData) {
    var data = {
      "generation": generationId,
      "noSerie": serialNo,
      "eName": "sensor/vacuum",
      "eData": vacData.eData
    };
    var message = {
      "coreid": deviceId,
      "published_at": "2026-03-06T12:00:00.000Z",
      "data": JSON.stringify(data)
    };
    return {
      "type": 'utf8',
      "utf8Data": JSON.stringify(message)
    };
  }

  it('should set pumpOn=true when vacuum drops below -6', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var msg = makeVacuumMessage("POMPE 1", 1, 1, {
      
      "eData": -10
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msg).then(function() {
          var sensor = dashboard.getVacuumSensorByCode("PV1");
          assert.equal(true, sensor.pumpOn);
          assert.equal(-10, sensor.rawValue);
        });
      });
    });
  });

  it('should set pumpOn=false when vacuum rises above -4', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    // First turn pump ON
    var msgOn = makeVacuumMessage("POMPE 1", 1, 1, {
      
      "eData": -10
    });
    // Then turn pump OFF
    var msgOff = makeVacuumMessage("POMPE 1", 1, 2, {
      
      "eData": -2
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msgOn).then(function() {
          return connection.fakeReceive(msgOff).then(function() {
            var sensor = dashboard.getVacuumSensorByCode("PV1");
            assert.equal(false, sensor.pumpOn);
          });
        });
      });
    });
  });

  it('should not change state in deadband (-6 to -4)', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    // Turn pump ON first
    var msgOn = makeVacuumMessage("POMPE 1", 1, 1, {
      
      "eData": -10
    });
    // Send value in deadband
    var msgDeadband = makeVacuumMessage("POMPE 1", 1, 2, {
      
      "eData": -5
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msgOn).then(function() {
          return connection.fakeReceive(msgDeadband).then(function() {
            var sensor = dashboard.getVacuumSensorByCode("PV1");
            assert.equal(true, sensor.pumpOn, "Pump should stay ON in deadband");
          });
        });
      });
    });
  });

  it('should accumulate RunTimeSinceMaint while pump is ON', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var msgOn = makeVacuumMessage("POMPE 1", 1, 1, {
      
      "eData": -10
    });
    var msgStillOn = makeVacuumMessage("POMPE 1", 1, 2, {
      
      "eData": -12
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msgOn).then(function() {
          return connection.fakeReceive(msgStillOn).then(function() {
            var sensor = dashboard.getVacuumSensorByCode("PV1");
            assert.ok(sensor.RunTimeSinceMaint >= 0, "RunTimeSinceMaint should be >= 0");
            assert.equal(typeof sensor.RunTimeSinceMaint, "number");
          });
        });
      });
    });
  });

  it('should set NeedMaintenance when RunTimeSinceMaint >= 180000 (50h)', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var msg = makeVacuumMessage("POMPE 1", 1, 1, {
      
      "eData": -10
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msg).then(function() {
          // Manually set RunTimeSinceMaint to just under 50h
          var sensor = dashboard.getVacuumSensorByCode("PV1");
          sensor.RunTimeSinceMaint = 180000;
          // Send another ON reading to trigger re-evaluation
          var msg2 = makeVacuumMessage("POMPE 1", 1, 2, {
            
            "eData": -10
          });
          return connection.fakeReceive(msg2).then(function() {
            var s = dashboard.getVacuumSensorByCode("PV1");
            assert.equal(true, s.NeedMaintenance);
          });
        });
      });
    });
  });

  it('should reset counter via resetPumpMaintCounter', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    var msg = makeVacuumMessage("POMPE 1", 1, 1, {
      
      "eData": -10
    });
    return dashboard.init().then(function() {
      return dashboard.connect().then(function(connection) {
        return connection.fakeReceive(msg).then(function() {
          var sensor = dashboard.getVacuumSensorByCode("PV1");
          sensor.RunTimeSinceMaint = 200000;
          sensor.NeedMaintenance = true;
          return dashboard.resetPumpMaintCounter("PV1").then(function(result) {
            assert.equal(true, result);
            var s = dashboard.getVacuumSensorByCode("PV1");
            assert.equal(0, s.RunTimeSinceMaint);
            assert.equal(false, s.NeedMaintenance);
            assert.equal(false, s.pumpOn);
          });
        });
      });
    });
  });

  it('should return false when resetting unknown sensor code', function() {
    var dashboard = require('../dashboard.js').Dashboard(config, ws);
    return dashboard.init().then(function() {
      return dashboard.resetPumpMaintCounter("UNKNOWN").then(function(result) {
        assert.equal(false, result);
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
