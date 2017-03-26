var WebSocketClient = require('websocket').client;
var config = require('./config.json');
const Influx = require('influx')
const influx = new Influx.InfluxDB({
  host: config['influxdb']['host'],
  database: 'erabliere',
  schema: [
    {
      measurement: 'flow_rate',
      fields: {
        device: Influx.FieldType.STRING,
        rate: Influx.FieldType.INTEGER
      },
      tags: [
        'pump'
      ]
    }
  ]
})
var dashboard = require('./dashboard.js').Dashboard(config, WebSocketClient);
dashboard.init().then(function() {
  console.log('Initialized.');
  return dashboard.connect().then(function() {
    console.log('Connected. Starting...');
    dashboard.start();
    return dashboard.update();
  });
}).catch(function(err) {
  console.error("Error stating dashboard: ", err.stack);
});
dashboard.onChange(function() {
  // Push to InfluxDB
});
console.log('Running.');
