var Promise = require('promise');

// TODO Use http://docs.sequelizejs.com/en/latest/api/sequelize/
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
  var devices = [];

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

  function handleMessage(message) {
    var deviceId = message.coreid;
    message.data = JSON.parse(message.data);
    var serialNo = message.data.noSerie;
    return getDevice(deviceId).then(function(device) {
      if (device === undefined) {
        console.log("Device " + deviceId + " is new!");
        return addDevice(new Device(deviceId, "New" + deviceId, serialNo));
      } else {
        if (device.lastEventSerial < serialNo) {
          device.lastEventSerial = serialNo;
          console.log("Updating device " + device.id + " to " + serialNo);
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
  });
  client.on('connect', function(con) {
    connection = con;
    console.log('WebSocket Client Connected');
    onConnectSuccess(connection);
    connection.on('error', function(error) {
      console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
      console.log('event-stream Connection Closed');
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

  return {
    "connect": function() {
      client.connect(uri, 'event-stream');
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
    "getDevice": getDevice
  }
};
