"use strict";
// require("dotenv").config();
// const accessToken = process.env.PARTICLE_TOKEN;
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args)); // Add this line
const fs = require("fs");
const path = require("path");
const util = require("util");
const Promise = require("promise");
const _ = require("underscore");

const readFile = Promise.denodeify(fs.readFile);
const writeFile = Promise.denodeify(fs.writeFile);
const MM_PER_INCH = 25.4;
const DEFAULT_ULTRASONIC_TANK_FILTER_ALPHA = 0.2;
const DEFAULT_PRESSURE_TANK_FILTER_ALPHA = 0.25;
const STALE_EB_GENERATION_DRIFT_THRESHOLD = 1000000;
const STALE_EB_GENERATION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;
const STALE_EB_SERIAL_DRIFT_THRESHOLD = 10000;

function parseNumericValue(value) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function getTankSensorType(tank) {
    return typeof tank.sensorType === "string"
        ? tank.sensorType.toLowerCase()
        : "ultrasonic";
}

function getTankRawUnit(tank) {
    const rawUnit = tank.rawUnit || tank.units;
    if (typeof rawUnit !== "string") {
        return "";
    }
    return rawUnit.toLowerCase();
}

function convertRawToMillimeters(rawValue, rawUnit) {
    const numericRawValue = parseNumericValue(rawValue);
    if (!Number.isFinite(numericRawValue)) {
        return NaN;
    }

    switch (rawUnit) {
        case "in":
        case "inch":
        case "inches":
        case "po":
        case "pouce":
        case "pouces":
            return numericRawValue * MM_PER_INCH;
        case "mm":
        case "millimeter":
        case "millimeters":
        case "millimetre":
        case "millimetres":
        default:
            return numericRawValue;
    }
}

function getTankLevelMm(tank) {
    const sensorType = getTankSensorType(tank);
    const rawUnit =
        getTankRawUnit(tank) || (sensorType === "pressure" ? "in" : "mm");
    const scaleFactor = parseNumericValue(tank.scaleFactor);
    let rawValueMm = convertRawToMillimeters(tank.rawValue, rawUnit);

    if (!Number.isFinite(rawValueMm)) {
        return NaN;
    }
    if (Number.isFinite(scaleFactor)) {
        rawValueMm *= scaleFactor;
    }

    if (sensorType === "pressure") {
        const offsetMm = parseNumericValue(tank.offset);
        const calibratedLevelMm =
            rawValueMm - (Number.isFinite(offsetMm) ? offsetMm : 0);
        return Math.max(0, calibratedLevelMm);
    }

    const sensorHeightMm = parseNumericValue(tank.sensorHeight);
    if (!Number.isFinite(sensorHeightMm)) {
        return Math.max(0, rawValueMm);
    }
    return Math.max(0, sensorHeightMm - rawValueMm);
}

function parseFilterAlpha(value) {
    const alpha = parseNumericValue(value);
    if (!Number.isFinite(alpha) || alpha <= 0 || alpha > 1) {
        return NaN;
    }
    return alpha;
}

function getTankFilterAlpha(tank) {
    const explicitAlpha = parseFilterAlpha(tank.filterAlpha);
    if (Number.isFinite(explicitAlpha)) {
        return explicitAlpha;
    }
    return getTankSensorType(tank) === "pressure"
        ? DEFAULT_PRESSURE_TANK_FILTER_ALPHA
        : DEFAULT_ULTRASONIC_TANK_FILTER_ALPHA;
}
function getTankMaxLevelMm(tank) {
    if (tank.shape === "u") {
        const totalHeightMm = parseNumericValue(tank.totalHeight);
        if (Number.isFinite(totalHeightMm) && totalHeightMm > 0) {
            return totalHeightMm;
        }
    }
    const diameterMm = parseNumericValue(tank.diameter);
    if (Number.isFinite(diameterMm) && diameterMm > 0) {
        return diameterMm;
    }
    return NaN;
}

function convertMillimetersToRaw(mmValue, rawUnit) {
    if (!Number.isFinite(mmValue)) {
        return NaN;
    }
    switch (rawUnit) {
        case "in":
        case "inch":
        case "inches":
        case "po":
        case "pouce":
        case "pouces":
            return mmValue / MM_PER_INCH;
        case "mm":
        case "millimeter":
        case "millimeters":
        case "millimetre":
        case "millimetres":
        default:
            return mmValue;
    }
}

function isRawValuePlausibleForTank(tank, rawValue) {
    const numericRawValue = parseNumericValue(rawValue);
    if (!Number.isFinite(numericRawValue)) {
        return false;
    }

    const sensorType = getTankSensorType(tank);
    const rawUnit =
        getTankRawUnit(tank) || (sensorType === "pressure" ? "in" : "mm");

    if (sensorType === "pressure") {
        const maxLevelMm = getTankMaxLevelMm(tank);
        if (!Number.isFinite(maxLevelMm)) {
            return true;
        }
        const offsetMm = parseNumericValue(tank.offset);
        const maxRawMm =
            maxLevelMm + (Number.isFinite(offsetMm) ? offsetMm : 0);
        const maxRaw = convertMillimetersToRaw(maxRawMm, rawUnit);
        if (!Number.isFinite(maxRaw)) {
            return true;
        }
        const margin = Math.max(10, maxRaw * 0.25);
        return numericRawValue >= -1 && numericRawValue <= maxRaw + margin;
    }

    const sensorHeightMm = parseNumericValue(tank.sensorHeight);
    if (!Number.isFinite(sensorHeightMm)) {
        return true;
    }
    const maxRaw = convertMillimetersToRaw(sensorHeightMm, rawUnit);
    if (!Number.isFinite(maxRaw)) {
        return true;
    }
    const margin = Math.max(200, maxRaw * 0.25);
    return numericRawValue >= -50 && numericRawValue <= maxRaw + margin;
}

function getPressureTankMaxRawValue(tank) {
    if (getTankSensorType(tank) !== "pressure") {
        return NaN;
    }
    const maxLevelMm = getTankMaxLevelMm(tank);
    if (!Number.isFinite(maxLevelMm)) {
        return NaN;
    }
    const offsetMm = parseNumericValue(tank.offset);
    const maxRawMm = maxLevelMm + (Number.isFinite(offsetMm) ? offsetMm : 0);
    const rawUnit = getTankRawUnit(tank) || "in";
    return convertMillimetersToRaw(maxRawMm, rawUnit);
}

function getPressureRawJumpThreshold(tank) {
    const maxRawValue = getPressureTankMaxRawValue(tank);
    return Number.isFinite(maxRawValue) ? Math.max(5, maxRawValue * 0.2) : 20;
}

function isPressureRawJumpTooLarge(tank, previousRawValue, incomingRawValue) {
    if (getTankSensorType(tank) !== "pressure") {
        return false;
    }
    if (
        !Number.isFinite(previousRawValue) ||
        !Number.isFinite(incomingRawValue)
    ) {
        return false;
    }
    const threshold = getPressureRawJumpThreshold(tank);
    return Math.abs(incomingRawValue - previousRawValue) > threshold;
}

function applyTankExponentialFilter(tank, incomingRawValue) {
    const numericIncomingRawValue = parseNumericValue(incomingRawValue);
    if (!Number.isFinite(numericIncomingRawValue)) {
        return NaN;
    }

    const alpha = getTankFilterAlpha(tank);
    if (!Number.isFinite(alpha)) {
        tank.unfilteredRawValue = numericIncomingRawValue;
        tank.filteredRawValue = numericIncomingRawValue;
        return numericIncomingRawValue;
    }

    const previousFilteredRawValue = parseNumericValue(
        typeof tank.filteredRawValue !== "undefined"
            ? tank.filteredRawValue
            : tank.rawValue,
    );
    const incomingIsPlausible = isRawValuePlausibleForTank(
        tank,
        numericIncomingRawValue,
    );
    const previousIsPlausible = Number.isFinite(previousFilteredRawValue)
        ? isRawValuePlausibleForTank(tank, previousFilteredRawValue)
        : true;
    const jumpTooLarge = isPressureRawJumpTooLarge(
        tank,
        previousFilteredRawValue,
        numericIncomingRawValue,
    );
    const shouldResetFilterBaseline =
        Number.isFinite(previousFilteredRawValue) &&
        incomingIsPlausible &&
        (!previousIsPlausible || jumpTooLarge);
    if (shouldResetFilterBaseline) {
        const resetReason = !previousIsPlausible
            ? "persisted_value_implausible"
            : "pressure_jump_too_large";
        const rawDelta = Math.abs(
            numericIncomingRawValue - previousFilteredRawValue,
        );
        const jumpThreshold = getPressureRawJumpThreshold(tank);
        console.warn(
            "Resetting tank filter baseline for '%s' (%s): reason=%s previousRawValue=%s incomingRawValue=%s delta=%s threshold=%s alpha=%s",
            tank.code,
            tank.device,
            resetReason,
            previousFilteredRawValue,
            numericIncomingRawValue,
            Number.isFinite(rawDelta) ? rawDelta.toFixed(2) : "n/a",
            Number.isFinite(jumpThreshold) ? jumpThreshold.toFixed(2) : "n/a",
            alpha.toFixed(3),
        );
    }
    const filteredRawValue =
        Number.isFinite(previousFilteredRawValue) && !shouldResetFilterBaseline
            ? alpha * numericIncomingRawValue +
              (1 - alpha) * previousFilteredRawValue
            : numericIncomingRawValue;

    tank.unfilteredRawValue = numericIncomingRawValue;
    tank.filteredRawValue = filteredRawValue;
    return filteredRawValue;
}

function sanitizePersistedTankData(tankConfig, persistedTankData) {
    const runtimeData = _.extend({}, persistedTankData || {});
    const sensorType =
        typeof tankConfig.sensorType === "string"
            ? tankConfig.sensorType.toLowerCase()
            : "";

    if (sensorType === "pressure") {
        const persistedRawValue = parseNumericValue(runtimeData.rawValue);
        const persistedFillValue = parseNumericValue(runtimeData.fill);
        if (
            !Number.isFinite(persistedRawValue) &&
            Number.isFinite(persistedFillValue)
        ) {
            runtimeData.rawValue = persistedFillValue;
            console.warn(
                "Migrated legacy persisted Datacer fill to rawValue for tank '%s'",
                tankConfig.code,
            );
        }
        delete runtimeData.fill;
        delete runtimeData.capacity;
    }

    return runtimeData;
}

exports.Device = function (
    id,
    name,
    generationId,
    lastEventSerial,
    maxDelayMinutes,
    eventName,
    retired,
) {
    this.id = id;
    this.name = name;
    this.generationId = generationId;
    this.lastEventSerial = lastEventSerial;
    this.maxDelayMinutes = maxDelayMinutes;
    this.eventName = eventName;
    this.retired = retired;
};

exports.Device.prototype.updateFrom = function (dev) {
    this.generationId = dev.generationId;
    this.lastEventSerial = dev.lastEventSerial;
    this.name = dev.name;
    return this;
};

/**
 * @class HorizontalCylindricTank
 * @description Represents a horizontal cylindric tank.
 * @param {object} self - The tank object.
 */
const HorizontalCylindricTank = function (self) {
    /**
     * @function getCapacity
     * @description Calculates the capacity of the tank.
     * @returns {number} The capacity of the tank.
     */
    self.getCapacity = function () {
        return Math.PI * Math.pow(self.diameter / 2000, 2) * self.length;
    };
    /**
     * @function getFill
     * @description Calculates the fill of the tank.
     * @returns {number} The fill of the tank.
     */
    self.getFill = function () {
        const levelMm = getTankLevelMm(self);
        return HorizontalCylindricTank.getFill(
            levelMm,
            self.diameter,
            self.length,
        );
    };
};

/**
 * @function getFill
 * @description Calculates the fill of a horizontal cylindric tank.
 * @param {number} level - The level of the liquid in the tank (in millimeters).
 * @param {number} diameter - The diameter of the tank (in millimeters).
 * @param {number} length - The length of the tank (in millimeters).
 * @returns {number} The fill of the tank.
 */
HorizontalCylindricTank.getFill = function (level, diameter, length) {
    // All measures in millimeters
    const numericLevel = parseNumericValue(level);
    const numericDiameter = parseNumericValue(diameter);
    const numericLength = parseNumericValue(length);

    if (
        !Number.isFinite(numericLevel) ||
        !Number.isFinite(numericDiameter) ||
        !Number.isFinite(numericLength) ||
        numericDiameter <= 0 ||
        numericLength <= 0
    ) {
        return null;
    }
    level = Math.max(0, Math.min(numericLevel, numericDiameter)); // Ensure level is valid
    let h = level / 1000;
    let d = numericDiameter / 1000;
    let r = d / 2;
    const fill = (
        (Math.pow(r, 2) * Math.acos((r - h) / r) -
            (r - h) * Math.sqrt(d * h - Math.pow(h, 2))) *
        numericLength
    );
    return Number.isFinite(fill) ? fill : null;
};

const UShapedTank = function (self) {
    self.getCapacity = function () {
        return getFill(self.totalHeight);
    };
    self.getFill = function () {
        return getFill(getTankLevelMm(self));
    };

    function getFill(level) {
        // All measures in millimeters
        const numericLevel = parseNumericValue(level);
        if (!Number.isFinite(numericLevel)) {
            return null;
        }
        level = Math.max(0, numericLevel); // Ensure level is not negative
        const bottomFill = getBottomFill(level);
        const topFill = getTopFill(level);
        if (!Number.isFinite(bottomFill) || !Number.isFinite(topFill)) {
            return null;
        }
        return bottomFill + topFill;
    }

    /**
     * @function getBottomFill
     * @description Calculates the fill of the bottom (cylindrical) part of the U-shaped tank.
     * @param {number} level - The level of the liquid in the tank (in millimeters).
     * @returns {number} The fill of the bottom part of the tank.
     */
    function getBottomFill(level) {
        const adjustedLevel = Math.min(level, self.diameter / 2);
        return HorizontalCylindricTank.getFill(
            adjustedLevel,
            self.diameter,
            self.length,
        );
    }
    /**
     * @function getTopFill
     * @description Calculates the fill of the top (rectangular) part of the U-shaped tank.
     * @param {number} level - The level of the liquid in the tank (in millimeters).
     * @returns {number} The fill of the top part of the tank.
     */
    function getTopFill(level) {
        const adjustedLevel = Math.max(0, level - self.diameter / 2);
        return (((self.diameter / 1000) * self.length) / 1000) * adjustedLevel;
    }
};

exports.Tank = function (attrs) {
    var self = this;
    _.extend(self, attrs);
    if (self.shape === "cylinder" && self.orientation === "horizontal") {
        HorizontalCylindricTank(self);
    } else if (self.shape === "u") {
        UShapedTank(self);
    } else {
        throw (
            "Unsupported tank (shape: " +
            self.shape +
            ", " +
            self.orientation +
            ")"
        );
    }
};

exports.VacuumSensor = function (attrs) {
    var self = this;
    _.extend(self, attrs);
    self.getValue = function () {
        return self.value;
    };
};

exports.osmose = function () {
    return theOsmose;
};

var PumpEvent = function (generationId, serialNo, data) {
    var self = this;
    self.generationId = generationId;
    self.serialNo = serialNo;
    _.extend(self, data);
};

PumpEvent.comparator = function (a, b) {
    if (a.generationId !== b.generationId) {
        return a.generationId - b.generationId;
    } else {
        return a.serialNo - b.serialNo;
    }
};

var Pump = (exports.Pump = function (pumpConfig) {
    var self = this;
    _.extend(self, pumpConfig);
    var events = [];
    self.load = function (pumpData) {
        console.log(
            "Loading configured pump '%s' on device '%s'",
            self.code,
            self.device,
        );
        return _.extend(self, _.omit(pumpData, "code", "device"));
    };
    self.update = function (event) {
        self.state = event.data.eData === 0;
        var pumpEvent = new PumpEvent(event.generationId, event.serialNo, {
            timer: event.data.timer,
            state: self.state,
        });
        events.push(pumpEvent);
        while (events.length > 3) {
            events.shift();
        }
        if (
            events.length === 3 &&
            !events[0].state &&
            events[1].state &&
            !events[2].state
        ) {
            self.cycleEnded(events[0], events[1], events[2]);
        }
    };
    self.cycleEnded = function (t0Event, t1Event, t2Event) {
        // self.duty = (t2Event.timer - t1Event.timer) / (t2Event.timer - t0Event.timer);
        console.log(
            "Pump cycle ended: " +
                (t1Event.timer - t0Event.timer) +
                " ms off, then " +
                (t2Event.timer - t1Event.timer) +
                " ms on (" +
                (self.duty * 100).toFixed(0) +
                "% duty)",
        );
    };
});

// Vacuum pump maintenance tracking constants
const PUMP_ON_THRESHOLD = -6; // inHg
const PUMP_OFF_THRESHOLD = -4; // inHg
const MAINT_SECONDS = 50 * 3600; // 50 hours
const TRACKED_PUMP_SENSORS = ["PV1", "PV2", "PV3"];

exports.Dashboard = function (config, WebSocketClient) {
    var Device = exports.Device;
    var Tank = exports.Tank;
    var osmose = exports.osmose;

    var uri = config.collectors[0].uri;
    var filename = config.store.filename;

    var listeners = []; // For onChange(data, event)
    var connectCallbacks = [];
    const queryCompleteCallbacks = [];
    var eventsSinceStore = 0;
    var devices = [];
    var tanks = [];
    var valves = [];
    var vacuumSensors = [];
    var pumps = [];
    var theOsmose = [];
    var waterMeters = [];
    const pendingRequests = {};

    var dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    function getTank(name) {
        return tanks
            .filter(function (tank) {
                return tank.name === name;
            })
            .shift();
    }

    function applyTemporaryEbRs1DatacerFallback() {
        // TEMPORARY WORKAROUND (EB-RS1 ultrasonic sensor fault):
        // Re-apply RS1 value from Datacer after event processing so incoming EB-RS1
        // ultrasound events (integer raw values) cannot revert displayed fill to invalid state.
        // Remove this once EB-RS1 ultrasound hardware is fixed.
        const ebRs1Tank = tanks.find(
            (tank) => tank.device === "EB-RS1" && tank.code === "RS1",
        );
        const datacerRs1Tank = tanks.find(
            (tank) =>
                tank.device !== "EB-RS1" &&
                tank.code === "RS1" &&
                typeof tank.sensorType === "string" &&
                tank.sensorType.toLowerCase() === "pressure",
        );

        if (!ebRs1Tank || !datacerRs1Tank) {
            return;
        }

        const datacerLevelMm = getTankLevelMm(datacerRs1Tank);
        const ebRs1SensorHeightMm = parseNumericValue(ebRs1Tank.sensorHeight);
        if (
            !Number.isFinite(datacerLevelMm) ||
            !Number.isFinite(ebRs1SensorHeightMm)
        ) {
            return;
        }

        ebRs1Tank.rawValue = Math.round(
            Math.max(0, ebRs1SensorHeightMm - datacerLevelMm),
        );
        ebRs1Tank.unfilteredRawValue = ebRs1Tank.rawValue;
        ebRs1Tank.filteredRawValue = ebRs1Tank.rawValue;
        ebRs1Tank.lastUpdatedAt =
            datacerRs1Tank.lastUpdatedAt || ebRs1Tank.lastUpdatedAt;
    }

    function addDevice(device) {
        devices.push(device);
        return Promise.resolve(device);
    }

    function getDevices() {
        return Promise.resolve(devices);
    }

    function getDevice(deviceId) {
        return getDevices().then(function (devs) {
            return devs
                .filter(function (dev) {
                    return dev.id === deviceId;
                })
                .shift();
        });
    }

    function updateDevice(device) {
        return getDevice(device.id).then(function (dev) {
            return dev.updateFrom(device);
        });
    }

    function requestEvents(device) {
        if (connection.connected) {
            console.log(
                "Requesting last event from device %s (%s)",
                device.name,
                device.id,
            );
            pendingRequests[device.id] = true;
            connection.sendUTF(
                JSON.stringify({
                    command: "query",
                    device: device.id,
                    limit: 1,
                }),
            );
        }
    }

    function subscribe() {
        if (connection.connected) {
            console.log("Subscribing to events from collector");
            connection.sendUTF(
                JSON.stringify({
                    command: "subscribe",
                }),
            );
        }
    }

    var connectBackoff = 50;

    function connect() {
        setupClient();
        client.connect(uri, "event-stream");
    }

    function reconnect() {
        connectBackoff = Math.min(connectBackoff * 1.5, 1000 * 60);
        console.warn(
            "Reconnecting to event stream in %d seconds",
            connectBackoff / 1000,
        );
        setTimeout(connect, connectBackoff);
    }

    function getValveOfDevice(device, identifier) {
        var valve = valves
            .filter(function (valve) {
                return (
                    valve.device === device.name &&
                    valve.identifier === identifier
                );
            })
            .shift();
        if (valve === undefined) {
            throw util.format(
                "Device %s has no valve with identifier %d at gen: %d, serial: %d",
                device.name,
                identifier,
                device.generationId,
                device.lastEventSerial,
            );
        }
        return valve;
    }

    function getValveByCode(code) {
        var valve = valves
            .filter(function (valve) {
                return valve.code === code;
            })
            .shift();
        if (valve === undefined) {
            throw "No valve with code " + code + " is defined";
        }
        return valve;
    }

    function getOsmoseDevice(device) {
        var sensor = theOsmose
            .filter(function (sensor) {
                return sensor.device === device.name;
            })
            .shift();
        // if (sensor === undefined) {
        //     throw "Device " + device.name + " has no vacuum sensor";
        // }
        return sensor;
    }

    function getVacuumSensorOfDevice(device) {
        var sensor = vacuumSensors
            .filter(function (sensor) {
                return sensor.device === device.name;
            })
            .shift();
        if (sensor === undefined) {
            throw "Device " + device.name + " has no vacuum sensor";
        }
        return sensor;
    }

    function getVacuumSensorOfLineVacuumDevice(device, input) {
        var sensor = vacuumSensors.filter(function (sensor) {
            return sensor.device === device.name;
        });
        if (sensor === undefined) {
            throw (
                "Device " +
                device.name +
                " has no vacuum sensor on input: " +
                input
            );
        }
        return sensor[input];
    }

    function getVacuumSensorByCode(code) {
        var sensor = vacuumSensors
            .filter(function (sensor) {
                return sensor.code === code;
            })
            .shift();
        if (sensor === undefined) {
            throw "Dashboard has no vacuum sensor with code " + code;
        }
        return sensor;
    }

    function getPumpOfDevice(device) {
        var pump = pumps
            .filter(function (pump) {
                return pump.device === device.name;
            })
            .shift();
        if (pump === undefined) {
            throw "Device " + device.name + " has no pump";
        }
        return pump;
    }

    const positionCode = ["Erreur", "Ouverte", "Fermé", "Partiel"];

    function handlePumpEvent(device, event, evTopic, data, value) {
        var pump = getPumpOfDevice(device);
        switch (evTopic) {
            case "T1":
                pump.update(event, value);
                break;
            case "T2":
                pump.update(event, value);
                pump.run2long = false;
                break;
            case "state":
                pump.update(event, value);
                break;
            case "T2_ONtime":
                pump.ONtime = Math.abs(value / 1000);
                break;
            case "T1_OFFtime":
                pump.OFFtime = Math.abs(value / 1000);
                break;
            case "CurrentDutyCycle":
                pump.duty = value / 1000;
                break;
            case "endCycle":
                pump.volume += (pump.ONtime * pump.capacity_gph) / 3600;
                pumps.forEach(function (pump) {
                    if (pump.device === device.name) {
                        pump.duty = value / 1000;
                        pump.lastUpdatedAt = event.published_at;
                        event.object = extendPump(pump);
                    }
                });
                break;
            case "warningRunTooLong":
                pump.run2long = true;
                break;
            case "debutDeCoulee":
                pump.couleeEnCour = true;
                pump.debutDeCouleeTS = data.timestamp;
                // Snapshot water meter readings at coulée start (first pump to start)
                if (!waterMeters.some(m => m.couleeStartVolume !== undefined)) {
                    waterMeters.forEach(m => {
                        m.couleeStartVolume = parseFloat(m.volume_since_reset) || 0;
                    });
                    store();
                }
                if (pump.device === device.name) {
                    pump.duty = value / 1000;
                    pump.lastUpdatedAt = event.published_at;
                    event.object = extendPump(pump);
                    // Attach current water meter readings for ErabliExport
                    event.object.waterMeters = waterMeters.map(m => ({ ...m }));
                }
                break;
            case "finDeCoulee":
                pump.couleeEnCour = false;
                if (pump.device === device.name) {
                    pump.duty = value / 1000;
                    pump.lastUpdatedAt = event.published_at;
                    event.object = extendPump(pump);
                    // Attach current water meter readings for ErabliExport
                    event.object.waterMeters = waterMeters.map(m => ({ ...m }));
                }
                pump.duty = 0;
                pump.volume = 0;
                // Clear snapshot when no pump is still in coulée
                if (!pumps.some(p => p.couleeEnCour)) {
                    waterMeters.forEach(m => {
                        delete m.couleeStartVolume;
                    });
                    store();
                }
                break;
            case "RunTimeSinceMaint": // Vacuum pump event
                var sensor = getVacuumSensorOfDevice(device);
                if (sensor.device === device.name) {
                    sensor.RunTimeSinceMaint = value;
                    event.object = extendVacuum(sensor);
                }
                break;
            case "NeedMaintenance": // Vacuum pump event
                var sensor = getVacuumSensorOfDevice(device);
                if (sensor.device === device.name) {
                    sensor.NeedMaintenance = value;
                    event.object = extendVacuum(sensor);
                }
                break;
            default:
                console.warn(
                    "Unknown 'Pump' event topic from %s: %s %s",
                    device.name,
                    evTopic,
                    event.data.eData,
                );
        }
    }

    function updatePumpOperationCounter(sensor) {
        const now = Date.now();
        const rawValue = parseFloat(sensor.rawValue);
        if (isNaN(rawValue)) {
            return;
        }

        if (typeof sensor.RunTimeSinceMaint !== "number") {
            sensor.RunTimeSinceMaint =
                parseFloat(sensor.RunTimeSinceMaint) || 0;
        }

        if (rawValue < PUMP_ON_THRESHOLD) {
            // Pump is ON
            if (sensor.pumpOn && sensor.lastPumpCheckAt) {
                // Already ON — accumulate elapsed time
                const elapsed = (now - sensor.lastPumpCheckAt) / 1000;
                sensor.RunTimeSinceMaint += elapsed;
            }
            sensor.pumpOn = true;
            sensor.lastPumpCheckAt = now;
        } else if (rawValue > PUMP_OFF_THRESHOLD) {
            // Pump is OFF
            if (sensor.pumpOn && sensor.lastPumpCheckAt) {
                // Was ON — accumulate remaining time
                const elapsed = (now - sensor.lastPumpCheckAt) / 1000;
                sensor.RunTimeSinceMaint += elapsed;
            }
            sensor.pumpOn = false;
            sensor.lastPumpCheckAt = undefined;
        } else {
            // Deadband: keep current state; accumulate only if ON
            if (sensor.pumpOn && sensor.lastPumpCheckAt) {
                const elapsed = (now - sensor.lastPumpCheckAt) / 1000;
                sensor.RunTimeSinceMaint += elapsed;
                sensor.lastPumpCheckAt = now;
            }
        }

        sensor.NeedMaintenance = sensor.RunTimeSinceMaint >= MAINT_SECONDS;
    }

    function handleSensorEvent(device, event, evTopic, value) {
        const updateDevice = (property, value) => {
            device[property] = value;
        };

        const updateTank = (tank, value) => {
            const filteredRawValue = applyTankExponentialFilter(tank, value);
            if (!Number.isFinite(filteredRawValue)) {
                return;
            }
            tank.rawValue = filteredRawValue;
            tank.lastUpdatedAt = event.published_at;
            event.object = extendTank(tank);
        };

        const updateValve = (device, valveNumber, value) => {
            const valve = getValveOfDevice(device, valveNumber);
            if (valve.device === device.name) {
                valve.position = positionCode[value];
                event.object = extendValve(valve);
            }
        };

        switch (evTopic) {
            case "ambientTemp":
                updateDevice("ambientTemp", value);
                break;
            case "US100sensorTemp":
                updateDevice("sensorTemp", value);
                break;
            case "enclosureTemp":
                updateDevice("enclosureTemp", value);
                break;
            case "level":
                tanks.forEach((tank) => {
                    if (tank.device === device.name) {
                        const sensorType =
                            typeof tank.sensorType === "string"
                                ? tank.sensorType.toLowerCase()
                                : "";
                        if (sensorType === "pressure") {
                            return;
                        }
                        updateTank(tank, value);
                    }
                });
                break;
            case "outOfRange":
                // To do
                break;
            case "Valve1Pos":
                updateValve(device, 1, value);
                break;
            case "Valve2Pos":
                updateValve(device, 2, value);
                break;
            case "vacuum":
                const sensor = getVacuumSensorOfDevice(device);
                sensor.rawValue = value;
                sensor.lastUpdatedAt = event.published_at;
                if (TRACKED_PUMP_SENSORS.includes(sensor.code)) {
                    updatePumpOperationCounter(sensor);
                }
                event.object = extendVacuum(sensor);
                break;
            default:
                console.warn(
                    "Unknown 'Sensor' event topic from %s: %s %s",
                    device.name,
                    evTopic,
                    event.data.eData,
                );
        }
    }

    function handleVacuumEvent(device, event, evTopic, data) {
        switch (evTopic) {
            case "Lignes":
                // Get the sensor by matching both device name and label/code
                // The label identifies which specific sensor on the device
                const sensorCode = data.label || device.name;
                const sensor = vacuumSensors.find(
                    (s) => s.device === device.name && s.code === sensorCode,
                );

                if (sensor !== undefined) {
                    Object.assign(sensor, {
                        rawValue: data.eData,
                        lastUpdatedAt: data.lastUpdatedAt,
                        temp: data.temp,
                        percentCharge: data.percentCharge,
                        ref: data.ref,
                    });
                    if (TRACKED_PUMP_SENSORS.includes(sensor.code)) {
                        updatePumpOperationCounter(sensor);
                    }
                    event.object = extendVacuum(sensor);
                } else {
                    console.warn(
                        "No vacuum sensor found for device '%s' with code/label '%s'",
                        device.name,
                        sensorCode,
                    );
                }
                break;
            default:
                console.warn(
                    "Unknown 'Vacuum' event topic from %s: %s %s",
                    device.name,
                    evTopic,
                    event,
                );
        }
    }

    function handleOutputEvent(device, event, evTopic, value) {
        const updateDevice = (property, value) => {
            device[property] = value;
        };

        switch (evTopic) {
            case "enclosureHeating":
                updateDevice("enclosureHeating", value);
                break;
            case "ssrRelayState":
                updateDevice("ssrRelayState", value);
                break;
            default:
                console.warn(
                    "Unknown 'Output' event topic from %s: %s %s",
                    device.name,
                    evTopic,
                    event,
                );
        }
    }

    function handleDeviceEvent(device, event, evTopic) {
        switch (evTopic) {
            case "boot":
                // TODO Ignored
                break;
            case "NewGenSN":
                // TODO Ignored
                break;
            default:
                console.warn(
                    "Unknown 'Device' event topic from %s: %s %s",
                    device.name,
                    evTopic,
                    event,
                );
        }
    }

    function handleOsmoseEvent(device, event, evTopic, data) {
        const sensor = getOsmoseDevice(device);
        const commonUpdates = (updates) => {
            Object.assign(sensor, updates);
            sensor.lastUpdatedAt = event.published_at;
            event.object = extendOsmose(theOsmose);
        };

        switch (evTopic) {
            case "Start":
            case "Stop":
                commonUpdates({
                    state: data.state,
                    fonction: data.fonction,
                    sequence: data.sequence,
                    alarmNo: data.alarmNo,
                    alarmMsg: data.alarmMsg,
                    startStopTime: data.startStopTime,
                    runTimeSec: data.runTimeSec,
                });
                break;
            case "timeCounter":
                commonUpdates({
                    state: data.state,
                    TempsOperEnCour: data.TempsOperEnCour,
                    TempsSeq1234: data.TempsSeq1234,
                    TempsSeq4321: data.TempsSeq4321,
                    TempsDepuisLavage: data.TempsDepuisLavage,
                });
                break;
            case "operData":
                commonUpdates({
                    sequence: data.sequence,
                    Col1: data.Col1,
                    Col2: data.Col2,
                    Col3: data.Col3,
                    Col4: data.Col4,
                    Conc: data.Conc,
                    Temp: data.Temp,
                    Pres: data.Pres,
                });
                break;
            case "concData":
                commonUpdates({
                    sequence: data.sequence,
                    BrixSeve: data.BrixSeve,
                    BrixConc: data.BrixConc,
                });
                break;
            case "summaryData":
                commonUpdates({
                    sequence: data.sequence,
                    PC_Conc: data.PC_Conc,
                    Conc_GPH: data.Conc_GPH,
                    Filtrat_GPH: data.Filtrat_GPH,
                    Total_GPH: data.Total_GPH,
                    runTimeSec: data.runTimeSec,
                });
                break;
            case "alarm":
                commonUpdates({
                    state: data.state,
                    fonction: data.fonction,
                    sequence: data.sequence,
                    alarmNo: data.alarmNo,
                    alarmMsg: data.alarmMsg,
                });
                break;
            default:
                console.warn(
                    "Unknown 'Osmose' event topic from %s: %s %s",
                    device.name,
                    evTopic,
                    event,
                );
        }
    }

    function handleOptoInEvent(device, event, evTopic, value) {
        const updateValve = (device, valveNumber, value) => {
            const valve = getValveOfDevice(device, valveNumber);
            if (valve.device === device.name) {
                valve.position = positionCode[value + 1];
                event.object = extendValve(valve);
            }
        };

        switch (evTopic) {
            case "state":
                updateValve(device, 0, value);
                break;
            default:
                console.warn(
                    "Unknown 'OptoIn' event topic from '%s': %s %s",
                    device.name,
                    evTopic,
                    event,
                );
        }
    }

    function handleTankEvent(device, event, evTopic, data) {
        switch (evTopic) {
            case "Level":
                // Find or create tank entry in tanks array
                let tank = tanks.find(
                    (t) => t.device === device.name && t.code === data.name,
                );
                if (tank) {
                    const rawValue = parseNumericValue(
                        typeof data.rawValue !== "undefined"
                            ? data.rawValue
                            : data.ReadingValue,
                    );
                    const filteredRawValue = applyTankExponentialFilter(
                        tank,
                        rawValue,
                    );
                    const nextRawValue = Number.isFinite(filteredRawValue)
                        ? filteredRawValue
                        : tank.rawValue;
                    Object.assign(tank, {
                        isDatacer: true,
                        rawValue: nextRawValue,
                        unfilteredRawValue: Number.isFinite(rawValue)
                            ? rawValue
                            : tank.unfilteredRawValue,
                        filteredRawValue: Number.isFinite(rawValue)
                            ? rawValue
                            : tank.filteredRawValue,
                        depth: data.depth,
                        reportedCapacity: data.capacity,
                        reportedFill: data.fill,
                        lastUpdatedAt: data.lastUpdatedAt || event.published_at,
                    });
                    event.object = extendTank(tank);
                } else {
                    console.log(
                        "Datacer tank '%s' from device '%s' not in config, data received but not stored in dashboard state",
                        data.name,
                        device.name,
                    );
                }
                break;
            default:
                console.warn(
                    "Unknown 'Tank' event topic from '%s': %s %s",
                    device.name,
                    evTopic,
                    event,
                );
        }
    }

    function handleWaterEvent(device, event, evTopic, data) {
        switch (evTopic) {
            case "Volume":
                console.log(
                    "Water volume event from '%s': meter='%s', vol_since_reset=%s",
                    device.name,
                    data.name,
                    data.volume_since_reset,
                );
                // Store water meter data for dashboard display
                let meter = waterMeters.find(
                    (m) => m.device === device.name && m.name === data.name,
                );
                if (meter) {
                    // Save previous reading for flow rate calculation
                    meter.prevVolume = parseFloat(meter.volume_since_reset) || 0;
                    meter.prevTime = meter.lastUpdatedAt;
                    Object.assign(meter, {
                        volume_since_reset: data.volume_since_reset,
                        lastUpdatedAt: event.published_at,
                    });
                } else {
                    waterMeters.push({
                        device: device.name,
                        name: data.name,
                        volume_since_reset: data.volume_since_reset,
                        lastUpdatedAt: event.published_at,
                    });
                }
                break;
            default:
                console.warn(
                    "Unknown 'Water' event topic from '%s': %s %s",
                    device.name,
                    evTopic,
                    event,
                );
        }
    }

    function handleEvent(device, event) {
        const data = event.data;
        if (!data) {
            return Promise.reject({
                message: "Event is missing data",
                event: event,
            });
        }
        const value = data.eData;

        // Override event name from configuration if not present in payload
        if (!data.eName && device.eventName) {
            data.eName = device.eventName;
        }

        let name = data.eName ? data.eName.trim() : "";
        if (name === "Dev1_Vacuum/Lignes") {
            name = "Vacuum/Lignes";
        }

        const logFieldName = name === "Tank/Level" ? "fill" : "value";
        const logFieldValue = name === "Tank/Level" ? data.fill : value;

        device.lastUpdatedAt = event.published_at;
        console.log(
            "Event '%s' from device: '%s', %s: %s",
            name,
            device.name,
            logFieldName,
            logFieldValue,
        );

        const [mainTopic, subTopic] = name.split("/");
        switch (mainTopic) {
            case "pump":
                handlePumpEvent(device, event, subTopic, data, value);
                break;
            case "sensor":
                handleSensorEvent(device, event, subTopic, value);
                break;
            case "Vacuum":
                handleVacuumEvent(device, event, subTopic, data);
                break;
            case "output":
                handleOutputEvent(device, event, subTopic, value);
                break;
            case "device":
                handleDeviceEvent(device, event, subTopic);
                break;
            case "Osmose":
                handleOsmoseEvent(device, event, subTopic, data);
                break;
            case "optoIn":
                handleOptoInEvent(device, event, subTopic, value);
                break;
            case "Tank":
                handleTankEvent(device, event, subTopic, data);
                break;
            case "Water":
                handleWaterEvent(device, event, subTopic, data);
                break;
            default:
                console.warn(
                    "Unknown event '%s' from %s: %s",
                    device.name,
                    name,
                    event,
                );
        }
        applyTemporaryEbRs1DatacerFallback();
        return publishData(event, device);
    }

    function publishData(event, device) {
        return Promise.all(
            listeners.map((listener) => listener(getData(), event, device)),
        );
    }

    function isRealtimeCollectorEvent(data) {
        if (!data || typeof data.replay === "undefined") {
            return false;
        }
        const replay = parseNumericValue(data.replay);
        return Number.isFinite(replay) && replay === 0;
    }

    function isEbDevice(device) {
        return (
            !!device &&
            typeof device.name === "string" &&
            device.name.startsWith("EB-")
        );
    }

    function shouldRecoverStaleEbCursor(device, data) {
        return isEbDevice(device) && isRealtimeCollectorEvent(data);
    }

    function getInvalidEbGenerationReason(generationId, nowSeconds) {
        const numericGenerationId = parseNumericValue(generationId);
        if (!Number.isFinite(numericGenerationId)) {
            return "not_numeric";
        }

        const currentTimestampSeconds = Number.isFinite(nowSeconds)
            ? nowSeconds
            : Math.floor(Date.now() / 1000);
        const minValidGenerationId =
            currentTimestampSeconds - STALE_EB_GENERATION_MAX_AGE_SECONDS;

        if (numericGenerationId < minValidGenerationId) {
            return "too_old";
        }
        if (numericGenerationId > currentTimestampSeconds) {
            return "future";
        }

        return null;
    }

    function handleMessage(message) {
        if (message.name && message.name.startsWith("collector/")) {
            return handleCollectorMessage(message);
        }

        const deviceId = message.coreid;
        message.data = JSON.parse(message.data);
        const { noSerie: serialNo, generation: generationId } = message.data;

        return getDevice(deviceId).then((device) => {
            eventsSinceStore++;
            if (!device) {
                // For Datacer synthetic events (Tank/Level, Water/Volume, Vacuum/Lignes), 
                // create a temporary device object to allow processing
                const eventName = message.data.eName || '';
                if (eventName === 'Tank/Level' || eventName === 'Water/Volume' || eventName === 'Vacuum/Lignes') {
                    console.log("Processing Datacer event from new device: " + deviceId);
                    // Create a temporary device object for Datacer events
                    const tempDevice = {
                        id: deviceId,
                        name: message.data.name || message.data.device || deviceId,
                        generationId: generationId,
                        lastEventSerial: serialNo,
                    };
                    return handleEvent(tempDevice, message);
                } else {
                    console.log("Device " + deviceId + " is new!");
                    // TODO This adds duplicate devices to dashboard.json!
                    // return addDevice(new Device(deviceId, "New" + deviceId, generationId, serialNo)).then(handleEvent);
                }
            } else {
                const handleEventFunc = () => handleEvent(device, message);
                const shouldRecoverStaleCursor = shouldRecoverStaleEbCursor(
                    device,
                    message.data,
                );
                const nowSeconds = shouldRecoverStaleCursor
                    ? Math.floor(Date.now() / 1000)
                    : null;
                const incomingGenerationInvalidReason = shouldRecoverStaleCursor
                    ? getInvalidEbGenerationReason(generationId, nowSeconds)
                    : null;
                const persistedGenerationInvalidReason =
                    shouldRecoverStaleCursor &&
                    typeof device.generationId !== "undefined"
                        ? getInvalidEbGenerationReason(
                              device.generationId,
                              nowSeconds,
                          )
                        : null;

                if (incomingGenerationInvalidReason) {
                    console.warn(
                        "Ignoring realtime EB event with invalid generation for %s (%s): generation=%s reason=%s serial=%s.",
                        device.name,
                        deviceId,
                        generationId,
                        incomingGenerationInvalidReason,
                        serialNo,
                    );
                    return Promise.reject({
                        error: util.format(
                            "Received event with invalid generation (%s) for EB device %s: %s",
                            generationId,
                            deviceId,
                            incomingGenerationInvalidReason,
                        ),
                        message: message,
                    });
                }

                if (typeof device.generationId === "undefined") {
                    console.log(
                        "First event received for device %s (%s,%s)",
                        deviceId,
                        generationId,
                        serialNo,
                    );
                    device.generationId = generationId;
                    device.lastEventSerial = serialNo;
                    return updateDevice(device).then(handleEventFunc);
                } else if (generationId !== device.generationId) {
                    if (generationId > device.generationId) {
                        console.warn(
                            "Device %s started a new generation of events: %s Accepting provided serial number: %s (was at %s, %s)",
                            deviceId,
                            generationId,
                            serialNo,
                            device.generationId,
                            device.lastEventSerial,
                        );
                        device.generationId = generationId;
                        device.lastEventSerial = serialNo;
                        return updateDevice(device).then(handleEventFunc);
                    } else {
                        const generationDrift =
                            device.generationId - generationId;
                        if (
                            shouldRecoverStaleCursor &&
                            (generationDrift >
                                STALE_EB_GENERATION_DRIFT_THRESHOLD ||
                                !!persistedGenerationInvalidReason)
                        ) {
                            const generationRecoveryReason =
                                generationDrift >
                                STALE_EB_GENERATION_DRIFT_THRESHOLD
                                    ? util.format(
                                          "drift=%s",
                                          generationDrift,
                                      )
                                    : util.format(
                                          "persisted_generation_%s",
                                          persistedGenerationInvalidReason,
                                      );
                            console.warn(
                                "Detected stale persisted generation for %s (%s): reason=%s incoming generation %s is behind persisted %s by %s. Resetting cursor to incoming event (%s,%s).",
                                device.name,
                                deviceId,
                                generationRecoveryReason,
                                generationId,
                                device.generationId,
                                generationDrift,
                                generationId,
                                serialNo,
                            );
                            device.generationId = generationId;
                            device.lastEventSerial = serialNo;
                            return updateDevice(device).then(handleEventFunc);
                        }
                        return Promise.reject({
                            error: util.format(
                                "Received event for old generation (%s) of device %s, which is now at generation %s. Ignored!",
                                generationId,
                                deviceId,
                                device.generationId,
                            ),
                            message: message,
                        });
                    }
                } else if (device.lastEventSerial < serialNo) {
                    device.lastEventSerial = serialNo;
                    return updateDevice(device).then(handleEventFunc);
                } else if (device.lastEventSerial === serialNo) {
                    // Ignoring duplicate event
                } else {
                    const serialDrift = device.lastEventSerial - serialNo;
                    if (
                        shouldRecoverStaleEbCursor(device, message.data) &&
                        serialDrift > STALE_EB_SERIAL_DRIFT_THRESHOLD
                    ) {
                        console.warn(
                            "Detected stale persisted serial for %s (%s): incoming serial %s is behind persisted %s by %s in generation %s. Resetting cursor to incoming event.",
                            device.name,
                            deviceId,
                            serialNo,
                            device.lastEventSerial,
                            serialDrift,
                            generationId,
                        );
                        device.lastEventSerial = serialNo;
                        return updateDevice(device).then(handleEventFunc);
                    }
                    return Promise.reject({
                        error: util.format(
                            "Received old event for device %s: %d, %s",
                            deviceId,
                            serialNo,
                            generationId,
                        ),
                        message: message,
                    });
                }
            }
        });
    }

    function handleCollectorMessage(message) {
        if (message.name === "collector/querycomplete") {
            const deviceId = message.data.command.device;
            delete pendingRequests[deviceId];
            if (Object.keys(pendingRequests).length > 0) {
                console.log(
                    util.format(
                        "Completed query for device %s with %d events; waiting for %d other devices.",
                        deviceId,
                        message.data.command.sent,
                        Object.keys(pendingRequests).length,
                    ),
                );
            } else {
                console.log(
                    util.format(
                        "Completed query for device %s with %d events; All queries completed.",
                        deviceId,
                        message.data.command.sent,
                    ),
                );
                store();
                queryCompleteCallbacks.forEach(function (callback) {
                    callback();
                });
            }
        } else {
            console.warn("Unhandled message from collector", message);
        }
        return Promise.resolve(message);
    }

    var client;
    var connection;
    var onConnectSuccess;
    var connectPromise = new Promise(function (complete, reject) {
        onConnectSuccess = complete;
    });

    function setupClient() {
        client = new WebSocketClient();
        client.on("connectFailed", function (error) {
            console.log("Connect Error: " + error.toString());
            reconnect();
        });
        client.on("connect", function (con) {
            connection = con;
            connectBackoff = 50;
            console.log("WebSocket Client Connected to: " + uri);
            onConnectSuccess(connection);
            connectCallbacks.forEach(function (callback) {
                callback();
            });
            connection.on("error", function (error) {
                console.log("Connection Error: " + error.toString());
                reconnect();
            });
            connection.on("close", function () {
                console.log("event-stream Connection Closed");
                reconnect();
            });
            connection.on("message", function (message) {
                if (message.type === "utf8") {
                    //console.log("Received: '" + message.utf8Data + "'");
                    try {
                        return handleMessage(JSON.parse(message.utf8Data)).catch(
                            function (err) {
                                console.error(err);
                            },
                        );
                    } catch (exception) {
                        console.error(
                            "Failed to handle message: " + message.utf8Data,
                            exception.stack,
                        );
                    }
                } else {
                    console.warn("Unknown message type: " + message.type);
                }
            });
        });
    }

    function init() {
        console.log("Initializing...");
        var configData = {
            devices: config.devices,
            tanks: config.tanks,
            valves: config.valves,
            vacuums: config.vacuums,
            pumps: config.pumps,
            osmose: config.osmose,
            // "temperatures": config.temperatures
        };
        if (fs.existsSync(filename)) {
            console.log("Data exists");
            console.log("Loading " + filename);
            return readFile(filename, "utf8")
                .then(JSON.parse)
                .then(function (dashData) {
                    return load(configData, dashData);
                });
        } else {
            console.log("Dashboard data not found. Initializing.");
            return load(configData, configData);
        }
    }

    function getData() {
        applyTemporaryEbRs1DatacerFallback();
        return {
            devices: devices,
            tanks: tanks.map(extendTank),
            valves: valves.map(extendValve),
            vacuums: vacuumSensors.map(extendVacuum),
            pumps: pumps.map(extendPump),
            osmose: theOsmose,
            waterMeters: waterMeters,
        };
    }

    function extendTank(tank) {
        tank = _.extend({}, tank);
        if (
            typeof tank.getCapacity === "function" &&
            typeof tank.getFill === "function"
        ) {
            tank.capacity = tank.getCapacity();
            tank.fill = tank.getFill();
        }
        return tank;
    }

    function extendPump(pump) {
        pump = _.extend({}, pump);
        // pump.T2ONtime = pump.ONtime;
        // pump.T1OFFtime = pump.OFFtime;
        return pump;
    }

    function extendValve(valve) {
        valve = _.extend({}, valve);
        valve.name = valve.code;
        return valve;
    }

    function extendVacuum(vacuumSensor) {
        vacuumSensor = _.extend({}, vacuumSensor);
        // vacuumSensor.RunTimeSinceMaint =
        return vacuumSensor;
    }

    function extendOsmose(osmose) {
        osmose = _.extend({}, osmose);
        return osmose;
    }

    function load(config, data) {
        devices = config.devices.map(function (dev) {
            var deviceData = data.devices
                .filter(function (devData) {
                    return devData.id === dev.id;
                })
                .shift();
            if (!deviceData) {
                deviceData = {};
            }
            console.log(
                "Loading configured device '%s' - '%s' (%s) at %s,%s",
                dev.name,
                dev.description,
                dev.id,
                deviceData.generationId,
                deviceData.lastEventSerial,
            );
            return new Device(
                dev.id,
                dev.name,
                deviceData.generationId,
                deviceData.lastEventSerial,
                dev.maxDelayMinutes,
                dev.eventName,
                dev.retired,
            );
        });

        tanks = config.tanks.map(function (tank) {
            const persistedTanks = Array.isArray(data.tanks) ? data.tanks : [];
            const codeMatches = persistedTanks.filter(function (tankData) {
                return tank.code === tankData.code;
            });
            var tankData = codeMatches
                .filter(function (matchedTankData) {
                    return matchedTankData.device === tank.device;
                })
                .shift();
            if (!tankData && codeMatches.length === 1) {
                tankData = codeMatches[0];
            }
            if (!tankData) {
                tankData = {};
            }
            console.log(
                "Loading configured tank '%s' - '%s' with raw level of %s, last updated at %s",
                tank.code,
                tank.name,
                tankData.rawValue,
                tankData.lastUpdatedAt,
            );
            var attrsFromConfig = [
                "name",
                "device",
                "shape",
                "orientation",
                "length",
                "diameter",
                "sensorHeight",
                "totalHeight",
                "sensorType",
                "rawUnit",
                "units",
                "offset",
                "scaleFactor",
                "output",
                "drain",
                "ssrRelay",
            ];
            var runtimeTankData = sanitizePersistedTankData(
                tank,
                _.omit(tankData, attrsFromConfig),
            );
            var loadedTank = new Tank(_.extend({}, tank, runtimeTankData));
            loadedTank.capacity = loadedTank.getCapacity();
            loadedTank.fill = loadedTank.getFill();
            return loadedTank;
        });

        valves = config.valves.map(function (valve) {
            var valveData = data.valves
                .filter(function (valveData) {
                    return valve.code === valveData.code;
                })
                .shift();
            console.log(
                "Loading configured valve '%s' on device '%s'",
                valve.code,
                valve.device,
            );
            return _.extend(valve, _.omit(valveData, "code", "name", "device"));
        });

        vacuumSensors = config.vacuums.map(function (sensor) {
            var sensorData = data.vacuums
                .filter(function (sensorData) {
                    return sensor.code === sensorData.code;
                })
                .shift();
            if (!data.vacuums) {
                return sensor;
            }
            console.log(
                "Loading configured vacuum sensor '%s' on device '%s'",
                sensor.code,
                sensor.device,
            );
            return _.extend(sensor, _.omit(sensorData, "code", "device"));
        });

        pumps = config.pumps.map(function (pump) {
            pump = new Pump(pump);
            if (!data.pumps) {
                return pump;
            }
            var pumpData = data.pumps
                .filter(function (pumpData) {
                    return pump.code === pumpData.code;
                })
                .shift();
            pump.load(pumpData);
            return pump;
        });

        theOsmose = config.osmose.map(function (sensor) {
            var sensorData = data.osmose
                .filter(function (sensorData) {
                    return sensor.code === sensorData.code;
                })
                .shift();
            if (!data.osmose) {
                return sensor;
            }
            console.log(
                "Loading configured osmose sensor '%s' on device '%s'",
                sensor.code,
                sensor.device,
            );
            return _.extend(sensor, _.omit(sensorData, "code", "device"));
        });

        if (data.waterMeters && Array.isArray(data.waterMeters)) {
            waterMeters = data.waterMeters;
            console.log("Loaded %d water meter(s) from stored data", waterMeters.length);
        }

        return Promise.resolve();
    }

    function store() {
        const data = getData();
        const { token, valveSelectorPassword, ...safeData } = data;
        const dataString = JSON.stringify(safeData, null, 2);
        var events = eventsSinceStore;
        // console.log("Writing to %s after %d events.", filename, events);
        return writeFile(filename, dataString, "utf8")
            .then(function () {
                // Counter may be incremented if a message was received while storing.
                eventsSinceStore = eventsSinceStore - events;
                console.log(
                    "Wrote " + filename + " with " + events + " new events.",
                );
            })
            .catch(function (err) {
                console.error(err);
            });
    }

    function resetPumpMaintCounter(sensorCode) {
        const sensor = vacuumSensors.find(
            (s) => s.code === sensorCode && TRACKED_PUMP_SENSORS.includes(s.code),
        );
        if (!sensor) {
            return Promise.resolve(false);
        }

        sensor.RunTimeSinceMaint = 0;
        sensor.NeedMaintenance = false;
        sensor.pumpOn = false;
        sensor.lastPumpCheckAt = undefined;
        console.log("Pump maintenance counter reset for sensor '%s'", sensorCode);

        return store().then(function () {
            return true;
        });
    }

    function checkStore() {
        if (eventsSinceStore > 100) {
            stop();
            start();
        }
    }

    var storeInterval;

    function start() {
        storeInterval = setInterval(checkStore, 1000 * 5);
    }

    function stop() {
        clearInterval(storeInterval);
        return store();
    }

    return {
        init: function () {
            return init();
        },
        connect: function (callback) {
            connect();
            if (callback) {
                connectCallbacks.push(callback);
            }
            return connectPromise;
        },
        onConnect: function (callback) {
            // TODO ??
        },
        subscribe: function () {
            subscribe();
        },
        update: function () {
            return getDevices()
                .then(function (devices) {
                    console.log("Updating " + devices.length + " devices");
                    devices.forEach(function (device) {
                        requestEvents(device);
                    });
                })
                .catch(function (err) {
                    console.error(err);
                });
        },
        start: function () {
            return start();
        },
        stop: function () {
            return stop();
        },
        getDevice: getDevice,
        getTank: getTank,
        getValve: getValveByCode,
        getVacuumSensorByCode: getVacuumSensorByCode,
        getVacuumSensorOfLineVacuumDevice: getVacuumSensorOfLineVacuumDevice,
        getData: getData,
        resetPumpMaintCounter: resetPumpMaintCounter,
        getEventsSinceStore: function () {
            return eventsSinceStore;
        },
        onChange: function (listener) {
            listeners.push(listener);
        },
        onQueryComplete: function (callback) {
            queryCompleteCallbacks.push(callback);
        },
    };
};
