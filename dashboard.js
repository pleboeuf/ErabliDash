const fs = require('fs');
const Promise = require('promise');
var filename = 'data/dashboard.json';

exports.Device = function(id, name, lastEventSerial) {
  this.id = id;
  this.name = name;
  this.lastEventSerial = lastEventSerial;
  this.updateFrom = function(dev) {
    this.lastEventSerial = dev.lastEventSerial;
    this.name = dev.name;
    return this;
  }
}
exports.Dashboard = function(uri, WebSocketClient) {
  var Device = exports.Device;
  var eventsSinceStore = 0;
  var devices = [];
  var tanks = [];

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

  function handleMessage(message) {
    var deviceId = message.coreid;
    message.data = JSON.parse(message.data);
    var serialNo = message.data.noSerie;
    return getDevice(deviceId).then(function(device) {
      eventsSinceStore++;
      if (device === undefined) {
        console.log("Device " + deviceId + " is new!");
        return addDevice(new Device(deviceId, "New" + deviceId, serialNo));
      } else {
        if (device.lastEventSerial < serialNo) {
          device.lastEventSerial = serialNo;
          //console.log("Updating device " + device.id + " to " + serialNo);
          return updateDevice(device);
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
    console.log('WebSocket Client Connected');
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
        var filename = 'dashboard-init.json';
        console.log("Dashboard data not found. Initializing from " + filename);
        return readFile(filename, 'utf8').then(JSON.parse).then(function(dashData) {
          return load(dashData);
          console.log("Loaded: " + filename);
        });
      } else {
        throw err;
      }
    });
  }

  function load(data) {
    devices = data.devices.map(function(dev) {
      return new Device(dev.id, dev.name, dev.lastEventSerial);
    });
    tanks = data.tanks;
  }

  function store() {
    var writeFile = Promise.denodeify(fs.writeFile);
    var data = {
      "devices": devices,
      "tanks": tanks
    };
    dataString = JSON.stringify(data, null, 2)
    var events = eventsSinceStore;
    writeFile(filename, dataString, "utf8").then(function() {
      // Counter may be incremented if a message was received while storing.
      eventsSinceStore = eventsSinceStore - events;
      console.log("Stored " + filename + " with " + events + " new events.");
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
    "getDevice": getDevice
  }
};
