# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

ErabliDash is a Node.js application for displaying maple syrup farm (érablière) data. It connects to an ErabliCollector system via WebSocket and provides a web-based dashboard for monitoring various aspects of maple syrup production including pumps, vacuum systems, tanks, valves, and osmosis equipment.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install
bower install

# Start the application
node app.js
# or
npm start

# Run tests
mocha

# Lint code
npx eslint .
```

### Docker Commands
```bash
# Build Docker container (requires config.json with hostname set to 'erablicollecteur')
docker build -t elecnix/erablidash -f docker-dash/Dockerfile .

# Run container (assuming collector container is named 'prickly_mcnulty')
docker run -d erablidash:/data -p 3000:3000 --link prickly_mcnulty:erablicollecteur elecnix/erablidash
```

### Testing Individual Components
```bash
# Run specific test files
mocha test/test.js

# Test tank calculations
node -e "var Tank = require('./dashboard.js').Tank; console.log(new Tank({shape: 'cylinder', orientation: 'horizontal', length: 1000, diameter: 2000, sensorHeight: 2000, rawValue: 1000}).getFill());"
```

## Architecture Overview

### Core Components

**app.js** - Main application entry point
- Sets up Express server with WebSocket support
- Handles HTTP endpoints (`/data.json`, `/api/vacuum`)
- Manages real-time client connections
- Serves static files from `public/` directory

**dashboard.js** - Core data management system
- `Dashboard` class: Main data aggregation and WebSocket management
- `Device` class: Represents IoT devices in the maple syrup operation
- `Tank` class: Models physical tanks with different geometries (cylinder, U-shaped)
- `Pump` class: Tracks pump performance and duty cycles
- Real-time data processing from WebSocket events
- Data persistence to JSON files

### Data Flow Architecture

1. **Data Collection**: IoT devices send telemetry via WebSocket to ErabliCollector. In addition, Vaccum Line data is obtained through an api to the Datacer system.
2. **Data Processing**: Dashboard connects to collector, processes events by topic (sensor, pump, vacuum, output, device, osmose, optoIn). It also merge Vacuum Line data from the Datacer system.
3. **Data Storage**: Processed data stored in JSON format and periodically updated
4. **Data API**: Express server exposes `/data.json` endpoint for frontend consumption
5. **Real-time Updates**: WebSocket server pushes updates to connected web clients

### Device Event System

Events are categorized by main topics:
- **sensor/**: Temperature, level, valve positions, vacuum readings
- **pump/**: Pump states, duty cycles, maintenance warnings
- **Vacuum/**: Vacuum line monitoring (Lignes)
- **output/**: Relay and heating system control
- **device/**: Device boot and generation management
- **Osmose/**: Reverse osmosis system operations
- **optoIn/**: Optical input sensor states

### Tank Geometry Calculations

The system supports two tank types:
- **Horizontal Cylindrical**: Uses circular segment volume calculations
- **U-Shaped**: Combines cylindrical bottom with rectangular top section

### Configuration System

Configuration is managed through `config.json` (use `sample.config.json` as template):
- **devices**: IoT device definitions with IDs and metadata
- **tanks**: Physical tank specifications with dimensions
- **valves**: Valve configurations linked to devices
- **vacuum**: Vacuum sensor definitions with offsets
- **pumps**: Pump specifications with capacity ratings
- **osmose**: Reverse osmosis system configuration

## Environment Variables

Required environment variables in `.env`:
- `ENDPOINT_VAC`: External vacuum data API endpoint
- `ENDPOINT_TANK`: Tank data API endpoint (if used)  
- `ENDPOINT_WATER`: Water data API endpoint (if used)
- `PARTICLE_TOKEN`: Particle.io API token for device access

## Frontend Structure

- `public/index.html`: Main dashboard navigation
- `public/numeric.html`: Numeric data displays
- `public/tableauDeBord.html`: Control board interface
- `public/vacuum.html`: Vacuum system monitoring

## Testing Strategy

The test suite covers:
- Device event processing and state management
- Tank volume calculations for different geometries
- WebSocket message handling and device updates
- Pump duty cycle calculations
- Valve position tracking
- Data persistence and retrieval

## Development Guidelines

### Adding New Device Types
1. Add device configuration to `config.json`
2. Implement event handlers in `dashboard.js` following the topic-based pattern
3. Add corresponding tests in `test/test.js`
4. Update frontend displays if needed

### Modifying Tank Calculations
- Tank geometry functions are in the `Tank` class and helper functions
- Always add tests for new tank shapes in the test suite
- Ensure measurements are consistently in millimeters

### WebSocket Event Handling
- Events follow the pattern: `mainTopic/subTopic`
- Handler functions are named `handle[MainTopic]Event`
- Always update `lastUpdatedAt` timestamp
- Use `publishData()` to notify connected clients

### Data External Integration
- External data sources are integrated via the `readDatacer()` function
- Data merging uses the `mergeVacuumData()` and `mergeDevicesData()` functions
- Failed API calls are logged but don't crash the application

## Production Deployment

- Use `ErabliDash.service` for systemd service configuration  
- Application runs on port 3300 by default (configurable in `config.json`)
- Ensure `config.json` exists and contains valid device/sensor configurations
- Set up proper environment variables for external API endpoints
- Monitor logs for WebSocket connection issues and device communication

## Key Dependencies

- **express**: Web server framework
- **websocket**: WebSocket client/server implementation
- **node-fetch**: HTTP client for external API calls  
- **cors**: Cross-origin resource sharing middleware
- **influx**: InfluxDB client (if time-series storage is needed)
- **particle-api-js**: Particle.io device management