const fs = require('fs');
const path = require('path');
const util = require('util');
const Promise = require('promise');

exports.Device = function(id, name, generationId, lastEventSerial) {
  this.id = id;
  this.name = name;
  this.generationId = generationId;
  this.lastEventSerial = lastEventSerial;
  this.updateFrom = function(dev) {
    this.generationId = dev.generationId;
    this.lastEventSerial = dev.lastEventSerial;
    this.name = dev.name;
    return this;
  }
}
exports.Dashboard = function(config, WebSocketClient) {
  var Device = exports.Device;

  var uri = config.collectors[0].uri;
  var filename = config.store.filename;

  var eventsSinceStore = 0;
  var devices = [];
  var tanks = [];

  var dir = path.dirname(filename);
  fs.exists(dir, function(exists) {
    if (!exists) {
      fs.mkdir(dir, new function(err) {
        console.error(err);
      });
    }
  });

  function getTank(name) {
    return tanks.filter(function(tank) {
      return tank.name == name;
    }).shift();
  }

  function addDevice(device) {
    devices.push(device);
    return Promise.resolve(device);
  }

  function getDevices() {
    return Promise.resolve(devices);
  }

  function getDevice(deviceId) {
    return getDevices().then(function(devs) {
      return devs.filter(function(dev) {
        return dev.id == deviceId;
      }).shift();
    });
  }

  function updateDevice(device) {
    return getDevice(device.id).then(function(dev) {
      return dev.updateFrom(device);
    });
  }

  function requestEvents(device) {
    if (connection.connected) {
      connection.sendUTF(JSON.stringify({
        "command": "query",
        "device": device.id,
        "generation": device.generationId,
        "after": device.lastEventSerial
      }));
    }
  }

  function connect() {
    client.connect(uri, 'event-stream');
  }
  var connectBackoff = 500;

  function reconnect() {
    connectBackoff = Math.min(connectBackoff * 2, 1000 * 60);
    setTimeout(connect, connectBackoff);
  }

  function handleEvent(device, event) {
    var data = event.data;
    tanks.forEach(function(tank) {
      if (tank.deviceName == device.name) {
        if (data.eName == "brunelle/prod/sonde/US100/Distance") {
          tank.rawValue = data.eData;
          tank.lastUpdatedAt = event.published_at;
        } else if (data.eName == "brunelle/prod/sonde/US100/Temperature") {
          tank.temperature = data.eData;
        } else {
          console.warn("Unknown data type for tank %s: %s", tank.name, data.eName);
        }
      }
    });
    return Promise.resolve(null);
  }

  function handleMessage(message) {
    var deviceId = message.coreid;
    message.data = JSON.parse(message.data);
    var serialNo = message.data.noSerie;
    var generationId = message.data.eGenTS;
    return getDevice(deviceId).then(function(device) {
      eventsSinceStore++;
      if (device === undefined) {
        console.log("Device " + deviceId + " is new!");
        return addDevice(new Device(deviceId, "New" + deviceId, generationId, serialNo)).then(handleEvent);
      } else {
        var handleEventFunc = function() {
          handleEvent(device, message)
        };
        if (typeof device.generationId === 'undefined') {
          console.log("First event received for device %s (%s,%s)", deviceId, generationId, serialNo);
          device.generationId = generationId;
          device.lastEventSerial = serialNo;
          return updateDevice(device).then(handleEventFunc);
        } else if (generationId != device.generationId) {
          if (generationId > device.generationId) {
            console.warn("Device %s started a new generation of events: %s Accepting provided serial number: %s (was at %s, %s)", deviceId, generationId, serialNo, device.generationId, device.lastEventSerial);
            device.generationId = generationId;
            device.lastEventSerial = serialNo;
            return updateDevice(device).then(handleEventFunc);
          } else {
            return Promise.reject(util.format("Received event for old generation (%s) of device %s, which is now at generation %s. Ignored!", generationId, deviceId, device.generationId));
          }
        } else if (device.lastEventSerial < serialNo) {
          device.lastEventSerial = serialNo;
          return updateDevice(device).then(handleEventFunc);
        } else {
          return Promise.reject(util.format("Received old event for device %s: %d, %s", deviceId, serialNo, generationId));
        }
      }
    });
  }

  var client = new WebSocketClient();
  var connection;
  var onConnectSuccess;
  var connectPromise = new Promise(function(complete, reject) {
    onConnectSuccess = complete;
  });
  client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
    reconnect();
  });
  client.on('connect', function(con) {
    connection = con;
    connectBackoff = 1;
    console.log('WebSocket Client Connected to: ' + uri);
    onConnectSuccess(connection);
    connection.on('error', function(error) {
      console.log("Connection Error: " + error.toString());
      reconnect();
    });
    connection.on('close', function() {
      console.log('event-stream Connection Closed');
      reconnect();
    });
    connection.on('message', function(message) {
      if (message.type === 'utf8') {
        console.log("Received: '" + message.utf8Data + "'");
        try {
          return handleMessage(JSON.parse(message.utf8Data)).catch(function(err) {
            console.error(err);
          });
        } catch (exception) {
          console.error("Failed to handle message: " + message.utf8Data, exception.stack);
        }
      } else {
        console.warn("Unknown message type: " + message.type);
      }
    });
  });

  function init() {
    var readFile = Promise.denodeify(fs.readFile);
    return readFile(filename, 'utf8').then(JSON.parse).then(function(dashData) {
      console.log("Loading " + filename);
      return load(dashData);
    }).catch(function(err) {
      if (err.errno == 34) {
        console.log("Dashboard data not found. Initializing.");
        var initData = {
          "devices": config.devices,
          "tanks": config.tanks
        }
        return load(initData);
      } else {
        throw err;
      }
    });
  }

  function getData() {
    return {
      "devices": devices,
      "tanks": tanks
    };
  }

  function load(data) {
    devices = data.devices.map(function(dev) {
      return new Device(dev.id, dev.name, dev.generationId, dev.lastEventSerial);
    });
    tanks = data.tanks;
  }

  function store() {
    var writeFile = Promise.denodeify(fs.writeFile);
    dataString = JSON.stringify(getData(), null, 2)
    var events = eventsSinceStore;
    console.log("Writing to %s after %d events.", filename, events);
    return writeFile(filename, dataString, "utf8").then(function() {
      // Counter may be incremented if a message was received while storing.
      eventsSinceStore = eventsSinceStore - events;
      console.log("Wrote " + filename + " with " + events + " new events.");
    }).catch(function(err) {
      console.error(err);
    });
  }

  function checkStore() {
    if (eventsSinceStore > 100) {
      stop();
      store();
      start();
    }
  }

  var storeInterval;

  function start() {
    storeInterval = setInterval(checkStore, 1000 * 5);
  }

  function stop() {
    clearInterval(storeInterval);
  }

  return {
    "init": function() {
      return init();
    },
    "connect": function() {
      connect();
      return connectPromise;
    },
    "update": function() {
      return getDevices().then(function(devices) {
        console.log("Updating " + devices.length + " devices");
        devices.forEach(function(device) {
          requestEvents(device);
        });
      }).catch(function(err) {
        console.error(err);
      });
    },
    "start": function() {
      return start();
    },
    "getDevice": getDevice,
    "getTank": getTank,
    "getData": getData,
    "getEventsSinceStore": function() {
      return eventsSinceStore;
    }
  }
};
