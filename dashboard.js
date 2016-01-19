var Promise = require('promise');

// TODO Use http://docs.sequelizejs.com/en/latest/api/sequelize/
exports.Device = function(id, name, lastEventSerial) {
  this.id = id;
  this.name = name;
  this.lastEventSerial = lastEventSerial;
}
exports.Dashboard = function(db, uri, WebSocketClient) {
    var Device = exports.Device;
    var devices = null;

    function request(deviceId, serial) {
      if (connection.connected) {
        connection.sendUTF(JSON.stringify({
          "command": "query",
          "device": deviceId,
          "after": serial
        }));
      }
    }

    function db_run(sql, params) {
      return new Promise(function(resolve, reject) {
        db.serialize(function() {
          db.run(sql, params, function(err) {
            if (err == null) {
              resolve();
            } else {
              reject(err);
            }
          });
        });
      });
    }

    function addDevice(device) {
      return insertDevice(device).then(function(device) {
        devices.push(device);
      });
    }

    function insertDevice(device) {
      var sql = "insert into devices (device_id, device_name, last_serial_no) values (?, ?, ?)";
      return db_run(sql, [device.id, device.name, device.lastEventSerial]).then(function() {
        return device;
      });
    }

    function getDevices() {
      if (devices != null) {
        return Promise.resolve(devices);
      }
      return new Promise(function(resolve, reject) {
        db.all("select * from devices", [], function(err, devs) {
          if (err) {
            console.error(err);
            reject(err);
          }
          devices = devs.map(function(dev) {
            return new Device(dev.device_id, dev.device_name, dev.last_serial_no);
          });
          resolve(devices);
        });
      });
    }

    function getDevice(deviceId) {
      return getDevices().then(function(devs) {
        return devs.filter(function(dev) {
          return dev.id == deviceId;
        }).shift();
      });
    }

    function updateDevice(device) {
      var sql = "update devices set last_serial_no = ? where device_id = ?";
      return db_run(sql, [device.lastEventSerial, device.id]).then(function() {
        return device;
      });
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
              console.log("Updating device " + device.id);
              return updateDevice(device);
            }
          }
        });
      }

      var client = new WebSocketClient();
      var connection;
      client.on('connectFailed', function(error) {
        console.log('Connect Error: ' + error.toString());
      });
      client.on('connect', function(con) {
        connection = con;
        console.log('WebSocket Client Connected');
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
        },
        "catchup": function() {
          if (connection.connected) {
            getDevices().forEach(function(device) {
              request(device.device_id, device.last_serial_no);
            });
          }
        }
      }
    };
