function wsUri(path) {
    const l = window.location;
    return (
        (l.protocol === "https:" ? "wss://" : "ws://") +
        l.hostname +
        (l.port != 80 && l.port != 443 ? ":" + l.port : "") +
        l.pathname +
        path
    );
}
let websocket;
let valveSelectorPassword = null; // Will be loaded from server

// Constants
const LITERS_PER_GALLON = 4.54609188;
const DISPLAY_DEVICES_INTERVAL_MS = 10000;
const MAXIMUM_AGE_MINUTES = 5;
const WEBSOCKET_RECONNECT_DELAY_MS = 5000;
const PAGE_RELOAD_INTERVAL_MS = 3600000; // 1 hour
const ALARM_LIMIT_SECONDS = 216000; // 60 hours
const SYRUP_BRIX = 66.0;
const VACUUM_DROP_YELLOW_LIMIT = 3.0;
const VACUUM_DROP_RED_LIMIT = 6.0;
const BATTERY_NORMAL_THRESHOLD = 36;
const BATTERY_LOW_THRESHOLD = 20;
const TANK_PERCENT_HIGH = 90;
const TANK_PERCENT_MEDIUM = 75;
const FUEL_TANK_LOW_THRESHOLD = 30;
const FUEL_TANK_CRITICAL_THRESHOLD = 15;

// Note: Capacity in Liters
let tankDefs = [
    {
        code: "RS1",
    },
    {
        code: "RS2",
    },
    {
        code: "RS3",
    },
    {
        code: "RS4",
    },
    {
        code: "RS5",
    },
    {
        code: "RS6",
    },
    {
        code: "RF1",
    },
    {
        code: "RF2",
    },
    {
        code: "RC1",
    },
    {
        code: "RC2",
    },
    {
        code: "RHC",
    },
];
let devices = [];
let valves = [];
let pumps = [];
let vacuums = [];
let osmose = [];
let couleeActive = false;
let tempAge = 0;
let valueRef = {};
let myToken;

function liters2gallons(liters) {
    return Math.ceil(liters / LITERS_PER_GALLON);
}

function onLoad() {
    openSocket();
    const displayDevicesInterval = setInterval(displayDevices, DISPLAY_DEVICES_INTERVAL_MS);
    const myURL = document.URL;
    const domaineStart = myURL.indexOf("://") + 3;
    const domaineEnd = myURL.lastIndexOf(":");
    const thisDomain = myURL.substring(domaineStart, domaineEnd);
}

function displayTanks() {
    let RStotal = 0;
    let RStotalCap = 0;
    let RFtotal = 0;
    let RFtotalCap = 0;
    let RCtotal = 0;
    let RCtotalCap = 0;
    tankDefs.forEach(function (tank) {
        let tankElementId = "tank_" + tank.code;
        let tankElement = document.getElementById(tankElementId);
        let tankNameElementId = tankElementId + "_name";
        let tankNameElement;
        let contentsElementId = tankElementId + "_contents";
        let contentsElement;
        let percentElementId = tankElementId + "_percent";
        let percentElement;
        let rawValueElementId = tankElementId + "_rawvalue";
        let rawValueElement;
        let capacityElementId = tankElementId + "_capacity";
        let capacityElement;
        let outputElementId = tankElementId + "_output";
        let outputElement;
        let drainElementId = tankElementId + "_drain";
        let drainElement;

        let RStotElement;
        let RStotPCElem;
        let RStoSiropElement;
        let RSdispElement;
        let RSmaxElement;

        let RFtotElement;
        let RFtotPCElement;
        let RFdispElement;
        let RFmaxElement;

        let RCtotElement;
        let RCtotPCElement;
        let RCtoSiropElement;
        let RCdispElement;
        let RCmaxElement;

        let SiropElement;

        if (tankElement == null) {
            tankElement = document.createElement("tr");
            tankElement.setAttribute("id", tankElementId);
            tankElement.setAttribute("class", "tank");

            // Add tank name
            let nameElement = document.createElement("td");
            nameElement.setAttribute("class", "tankname");
            nameElement.setAttribute("id", tankNameElementId);
            nameElement.innerHTML = tank.code;
            if (tank.code == "RS5" || tank.code == "RS6") {
                nameElement.innerHTML = tank.code + " (ph)";
            } else if (tank.code == "RF2") {
                nameElement.innerHTML = tank.code + " (Dph)";
            }
            tankElement.appendChild(nameElement);

            // Add measured contents (gallons)
            contentsElement = document.createElement("td");
            contentsElement.setAttribute("id", contentsElementId);
            contentsElement.setAttribute("class", "tankcontents");
            tankElement.appendChild(contentsElement);

            // Add measured contents (percent)
            percentElement = document.createElement("td");
            percentElement.setAttribute("id", percentElementId);
            percentElement.setAttribute("class", "tankpercent");
            tankElement.appendChild(percentElement);

            // Add output valve status
            outputElement = document.createElement("td");
            outputElement.setAttribute("id", outputElementId);
            outputElement.setAttribute("class", "tankoutput");
            tankElement.appendChild(outputElement);

            // Add drain valve status
            drainElement = document.createElement("td");
            drainElement.setAttribute("id", drainElementId);
            drainElement.setAttribute("class", "tankdrain");
            tankElement.appendChild(drainElement);

            // Add raw value (millimeters)
            rawValueElement = document.createElement("td");
            rawValueElement.setAttribute("id", rawValueElementId);
            rawValueElement.setAttribute("class", "rawvalue");
            tankElement.appendChild(rawValueElement);

            // Add capacity (gallons)
            capacityElement = document.createElement("td");
            capacityElement.setAttribute("id", capacityElementId);
            capacityElement.setAttribute("class", "tankcapacity");
            tankElement.appendChild(capacityElement);

            document.getElementById("tanklist").appendChild(tankElement);

            // Add RS1 to RS4 summary
            RStotPCElem = document.getElementById("RStotPC");
            RStotPCElem.setAttribute("class", "tankpercent");
            RStotElement = document.getElementById("RStot");
            RStotElement.setAttribute("class", "tankcontents");
            RStoSiropElement = document.getElementById("RStoSirop");
            RSdispElement = document.getElementById("RSdisp");
            RSdispElement.setAttribute("class", "tankcontents");
            RSmaxElement = document.getElementById("RSmax");
            RSmaxElement.setAttribute("class", "tankcapacity");

            // Add RF1 to RF2 summary
            RFtotPCElement = document.getElementById("RFtotPC");
            RFtotPCElement.setAttribute("class", "tankpercent");
            RFtotElement = document.getElementById("RFtot");
            RFtotElement.setAttribute("class", "tankcontents");
            RFdispElement = document.getElementById("RFdisp");
            RFdispElement.setAttribute("class", "tankcontents");
            RFmaxElement = document.getElementById("RFmax");
            RFmaxElement.setAttribute("class", "tankcapacity");

            // Add RSC to RC2 summary
            RCtotPCElement = document.getElementById("RCtotPC");
            RCtotPCElement.setAttribute("class", "tankpercent");
            RCtotElement = document.getElementById("RCtot");
            RCtotElement.setAttribute("class", "tankcontents");
            RCtoSiropElement = document.getElementById("RCtoSirop");
            RCdispElement = document.getElementById("RCdisp");
            RCdispElement.setAttribute("class", "tankcontents");
            RCmaxElement = document.getElementById("RCmax");
            RCmaxElement.setAttribute("class", "tankcapacity");

            SiropElement = document.getElementById("SIRtotal");
            SIRmaxElement = document.getElementById("SIRmax");
            SIRmaxElement.setAttribute("class", "tankcapacity");
        } else {
            tankNameElement = document.getElementById(tankNameElementId);
            capacityElement = document.getElementById(capacityElementId);
            rawValueElement = document.getElementById(rawValueElementId);
            percentElement = document.getElementById(percentElementId);
            contentsElement = document.getElementById(contentsElementId);
            outputElement = document.getElementById(outputElementId);
            drainElement = document.getElementById(drainElementId);
            // For summary table
            RStotPCElem = document.getElementById("RStotPC");
            RStotElement = document.getElementById("RStot");
            RStoSiropElement = document.getElementById("RStoSirop");
            RSdispElement = document.getElementById("RSdisp");
            RSmaxElement = document.getElementById("RSmax");

            RFtotPCElement = document.getElementById("RFtotPC");
            RFtotElement = document.getElementById("RFtot");
            RFdispElement = document.getElementById("RFdisp");
            RFmaxElement = document.getElementById("RFmax");

            RCtotPCElement = document.getElementById("RCtotPC");
            RCtotElement = document.getElementById("RCtot");
            RCtoSiropElement = document.getElementById("RCtoSirop");
            RCdispElement = document.getElementById("RCdisp");
            RCmaxElement = document.getElementById("RCmax");

            SiropElement = document.getElementById("SIRtotal");
        }
        // Display the data
        let tankPercent = ((tank.contents / tank.capacity) * 100).toFixed(0);
        tankElement.setAttribute("data-percent", tankPercent);
        capacityElement.innerHTML = liters2gallons(tank.capacity);
        rawValueElement.innerHTML = tank.rawValue;
        percentElement.innerHTML = tankPercent + " % ";
        contentsElement.innerHTML = liters2gallons(tank.contents);
        if (tank.rawValue < 5) {
            contentsElement.innerHTML = "----";
        }

        // Create the pie chart
        let gaugeElement = document.createElement("span");
        gaugeElement.innerHTML = tankPercent + "/100";
        if (tank.code == "RHC") {
            gaugeElement.setAttribute("class", "fueltankgauge");
        } else {
            gaugeElement.setAttribute("class", "tankgauge");
        }
        gaugeElement.setAttribute(
            "data-peity",
            '{ "fill": ["black", "#eeeeee"], "innerRadius": 0, "radius": 8 }',
        );
        percentElement.appendChild(gaugeElement);

        // Copy the output valve state from the valve table
        if (tank.output !== "none" && tank.output !== undefined) {
            let outValveElemId = "valve_" + tank.output + "_position";
            let outValvePosElem = document.getElementById(outValveElemId);
            let outValvePos = outValvePosElem.innerHTML;
            if (outValvePos !== null && outValvePos !== undefined) {
                outputElement.innerHTML = outValvePos;
                setIndicatorColor(outputElement, outValvePos);
            }
        }
        // set tank name color
        if (tank.ssrRelay !== "none" && tank.ssrRelay !== undefined) {
            let inValveElemId = "valve_" + tank.ssrRelay + "_position";
            let inValvePosElem = document.getElementById(inValveElemId);
            let inValvePos = inValvePosElem.innerHTML;
            if (inValvePos !== null && inValvePos !== undefined) {
                if (
                    inValvePosElem.innerHTML !== "undefined" &&
                    tankNameElement !== undefined
                ) {
                    if (tankNameElement.innerHTML == "RS4") {
                        tankNameElement =
                            document.getElementById("tank_RS5_name");
                        tankNameElement.style.backgroundColor =
                            inValvePosElem.style.backgroundColor;
                        tankNameElement =
                            document.getElementById("tank_RS6_name");
                        tankNameElement.style.backgroundColor =
                            inValvePosElem.style.backgroundColor;
                    } else {
                        tankNameElement.style.backgroundColor =
                            inValvePosElem.style.backgroundColor;
                    }
                }
            }
        }

        // Copy the drain valve state from the valve table
        if (tank.drain !== "none" && tank.drain !== undefined) {
            let drainValveElemId = "valve_" + tank.drain + "_position";
            let drainValvePosElem = document.getElementById(drainValveElemId);
            let drainValvePos = drainValvePosElem.innerHTML;
            if (typeof drainValvePos !== null) {
                drainElement.innerHTML = drainValvePos;
                setIndicatorColor(drainElement, drainValvePos);
            }
        }
        // Set color of line based on device lastUpdatedAt
        let tankElem = document.getElementById("tank_" + tank.code);
        setAgeColor(tankElem, tank.device);

        let plusRF2Check = document.getElementById("CheckRF2");
        if (
            tank.code.search("RS") >= 0 ||
            (plusRF2Check.checked == true && tank.code == "RF2")
        ) {
            // console.log("plusRF2Check", plusRF2Check.checked, "Include: ", tank.code);
            RStotal = RStotal + liters2gallons(tank.contents);
            RStotalCap = RStotalCap + liters2gallons(tank.capacity);
            RStotElement.innerHTML = RStotal.toFixed(0);
            RStotPCElem.innerHTML =
                ((RStotal / RStotalCap) * 100).toFixed(0) + "%";
            let seveBrix = document.getElementById("Osmose_BrixSeve").innerHTML;
            RStoSiropElement.innerHTML = ((RStotal * seveBrix) / SYRUP_BRIX).toFixed(
                0,
            );
            RSdispElement.innerHTML = (RStotalCap - RStotal).toFixed(0);
            RSmaxElement.innerHTML = RStotalCap.toFixed(0);
        }

        if (
            tank.code == "RF1" ||
            (plusRF2Check.checked == false && tank.code == "RF2")
        ) {
            // console.log("plusRF2Check", plusRF2Check.checked, "Include: ", tank.code);
            RFtotal = RFtotal + liters2gallons(tank.contents);
            RFtotalCap = RFtotalCap + liters2gallons(tank.capacity);
            RFtotElement.innerHTML = RFtotal.toFixed(0);
            RFtotPCElement.innerHTML =
                ((RFtotal / RFtotalCap) * 100).toFixed(0) + "%";
            RFdispElement.innerHTML = (RFtotalCap - RFtotal).toFixed(0);
            RFmaxElement.innerHTML = RFtotalCap.toFixed(0);
        }

        if (tank.code == "RC1" || tank.code == "RC2") {
            RCtotal = RCtotal + liters2gallons(tank.contents);
            RCtotalCap = RCtotalCap + liters2gallons(tank.capacity);
            RCtotElement.innerHTML = RCtotal.toFixed(0);
            RCtotPCElement.innerHTML =
                ((RCtotal / RCtotalCap) * 100).toFixed(0) + "%";
            let concBrix = document.getElementById("Osmose_BrixConc").innerHTML;
            RCtoSiropElement.innerHTML = ((RCtotal * concBrix) / SYRUP_BRIX).toFixed(
                0,
            );
            RCdispElement.innerHTML = (RCtotalCap - RCtotal).toFixed(0);
            RCmaxElement.innerHTML = RCtotalCap.toFixed(0);
            let seveBrix = document.getElementById("Osmose_BrixSeve").innerHTML;
            let SiropTotal = (
                (RStotal * seveBrix) / SYRUP_BRIX +
                (RCtotal * concBrix) / SYRUP_BRIX
            ).toFixed(0);
            SiropElement.innerHTML = SiropTotal;
        }
        // Set tank color
    });
    $(".tankgauge").peity("pie", {
        fill: function (value, index, values) {
            if (index > 0) {
                return "#eeeeee";
            }
            if (values[0] > TANK_PERCENT_HIGH) {
                return "red";
            }
            if (values[0] > TANK_PERCENT_MEDIUM) {
                return "orange";
            }
            return "green";
        },
    });
    $(".fueltankgauge").peity("pie", {
        fill: function (value, index, values) {
            if (index > 0) {
                return "#eeeeee";
            }
            if (values[0] < FUEL_TANK_LOW_THRESHOLD) {
                return "orange";
            }
            if (values[0] < FUEL_TANK_CRITICAL_THRESHOLD) {
                return "red";
            }
            return "green";
        },
    });
}

function functionPlusRF2() {
    let plusRF2Check = document.getElementById("CheckRF2");
    let RFsummaryNameElement = document.getElementById("RFsummaryName");
    if (CheckRF2.checked == true) {
        RFsummaryNameElement.innerHTML = "RF1";
    } else {
        RFsummaryNameElement.innerHTML = "RF1 + RF2";
    }
}

// Get the <span> element that closes the modal
let span = document.getElementsByClassName("close")[0];

// Open the modal (Sélecteur de valves d'entrée)
function showValveSelector() {
    const enteredPassword = prompt("Entrer le code", "");
    if (enteredPassword && valveSelectorPassword && enteredPassword === valveSelectorPassword) {
        // read actual relay state
        const inValves = getAllTanksInputValves(0);
        inValves.forEach(function (thisValve) {
            button = document.getElementsByName(thisValve.code);
            let devName = thisValve.device;
            // ssrRealy is active low
            let state = getRelayState(devName);
            if (state === undefined) {
                state = true;
            }
            button[0].checked = !state;
            button[1].checked = state;
            console.log(devName + " relay state: " + state);
        });
        // now show the panel
        const modal = document.getElementById("valveSelect");
        modal.style.display = "block";
    }
}

// Close the modal (Sélecteur de valves d'entrée)
// When the user clicks on <span (x)
function hideValveSelector() {
    const VaES1 = document.getElementById("VaES1_ON");
    const VaES2 = document.getElementById("VaES2_ON");
    const VaES3 = document.getElementById("VaES3_ON");
    if (
        VaES1.checked == true ||
        VaES2.checked == true ||
        VaES3.checked == true
    ) {
        const modal = document.getElementById("valveSelect");
        modal.style.display = "none";
    } else {
        alert("Au moins une des trois valves d'entrée doit être ouverte");
    }
}

// Close the modal (Sélecteur de valves d'entrée)
// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
    const modal = document.getElementById("valveSelect");
    if (event.target == modal) {
        hideValveSelector();
    }
};

// get only input valves
function getAllTanksInputValves(ident) {
    return valves.filter(function (valve) {
        return valve.identifier === ident;
    });
}

// Operation mode of the input valves
function tanksInputMode() {
    let manSW = document.getElementById("Manuel");
    let operMode = "undefined";
    if (manSW.checked) {
        operMode = "manual";
    } else {
        operMode = "auto";
    }
    console.log("Le mode d'opération est: " + operMode);
    return operMode;
}

// list the state of the valves selectors
function inputValvesOnOff(buttonId, cmd) {
    const inValves = getAllTanksInputValves(0);
    const valveSel = document.getElementsByName(buttonId);
    const dn = inValves.filter(function (thisValve) {
        return thisValve.code == buttonId;
    });
    let devName = dn[0].device;
    let devId = getDeviceId(devName);
    let text = cmd == "ON" ? "Ouvrir: " : "Fermer: ";
    console.log(
        text + buttonId + " avec device: " + devName + ", id: " + devId,
    );
    callFunction(devId, "relay", cmd);
}

function PHinputValvesOnOff(buttonId, cmd) {
    const VaAPH1_ON = document.getElementById("VaAPH1_ON");
    const VaDPH1_ON = document.getElementById("VaDPH1_ON");
    const VaAPH1_OFF = document.getElementById("VaAPH1_OFF");
    const VaDPH1_OFF = document.getElementById("VaDPH1_OFF");
    const inValves = getAllTanksInputValves(0);
    let PHdn = inValves.filter(function (x) {
        return x.code == "VaAPH1";
    });
    let PHdevName = PHdn[0].device;
    let PHdevId = getDeviceId(PHdevName);
    let DPHdn = inValves.filter(function (y) {
        return y.code == "VaDPH1";
    });
    let DPHdevName = DPHdn[0].device;
    let DPHdevId = getDeviceId(DPHdevName);

    if (buttonId == "VaAPH1" && cmd == "ON") {
        VaDPH1_OFF.checked = true;
        console.log("Ouvrir VaPH1 avec RS4, Fermer VaDPH1 avec RF2");
        callFunction(PHdevId, "relay", "on");
        callFunction(DPHdevId, "relay", "off");
    } else if (buttonId == "VaAPH1" && cmd == "OFF") {
        VaDPH1_ON.checked = true;
        console.log("Fermer VaPH1 avec RS4, Ouvrir VaDPH1 avec RF2");
        callFunction(PHdevId, "relay", "off");
        callFunction(DPHdevId, "relay", "on");
    } else if (buttonId == "VaDPH1" && cmd == "ON") {
        VaAPH1_OFF.checked = true;
        console.log("Ouvrir VaDPH1 avec RF2, Fermer VaPH1 avec RS4");
        callFunction(DPHdevId, "relay", "on");
        callFunction(PHdevId, "relay", "off");
    } else if (buttonId == "VaDPH1" && cmd == "OFF") {
        VaAPH1_ON.checked = true;
        console.log("Fermer VaDPH1 avec RF2, Ouvrir VaPH1 avec RS4");
        callFunction(DPHdevId, "relay", "off");
        callFunction(PHdevId, "relay", "on");
    }
}

function createCell(id, className, parentElem) {
    let cell = document.createElement("td");
    if (id) cell.setAttribute("id", id);
    cell.setAttribute("class", className);
    parentElem.appendChild(cell);
    return cell;
}

function displayDevices() {
    try {
        let oldestAge = 0;
        const devicelistElem = document.getElementById("devicelist");
        const latestUpdateElement = document.getElementById("lastestUpdate");
        
        if (!devicelistElem || !latestUpdateElement) {
            console.error('Required DOM elements not found');
            return;
        }
    devices.forEach(function (device) {
        if (device.retired) return;

        const deviceElemId = `device_${device.name}`;
        const lastUpdatedAtElemId = `${deviceElemId}_lastUpdatedAt`;
        const generationElemId = `${deviceElemId}_generationId`;
        const serialElemId = `${deviceElemId}_serial`;

        let deviceElem = document.getElementById(deviceElemId);
        if (!deviceElem) {
            deviceElem = document.createElement("tr");
            deviceElem.setAttribute("id", deviceElemId);
            devicelistElem.appendChild(deviceElem);

            // Create table cells
            const nameElement = createCell(null, "darker", deviceElem);
            nameElement.innerHTML = device.name;
            createCell(lastUpdatedAtElemId, "lighter", deviceElem);
            createCell(generationElemId, "lighter", deviceElem);
            createCell(serialElemId, "lighter rawvalue", deviceElem);
        }

        const lastUpdatedAtElem = document.getElementById(lastUpdatedAtElemId);
        const generationElem = document.getElementById(generationElemId);
        const serialElem = document.getElementById(serialElemId);

        const ageInMinutes = Math.floor(
            getMinutesAgo(new Date(device.lastUpdatedAt)),
        );

        let ageDisplay = ageInMinutes === 0 ? "now" : `${ageInMinutes} min.`;
        if (isNaN(ageInMinutes) || ageInMinutes === NaN) {
            ageDisplay = "---";
        }

        lastUpdatedAtElem.innerHTML = ageDisplay;

        lastUpdatedAtElem.style.color =
            ageInMinutes > (device.maxDelayMinutes || MAXIMUM_AGE_MINUTES) ? "FireBrick" : "black";

        if (device.generationId !== undefined) {
            generationElem.innerHTML = device.generationId;
            serialElem.innerHTML = device.lastEventSerial;
        } else {
            generationElem.innerHTML = "---";
            generationElem.style.textAlign = "center";
            serialElem.innerHTML = "---";
            serialElem.style.textAlign = "center";
        }

        oldestAge = Math.max(ageInMinutes, oldestAge);
        const ageDisplayTop = `${oldestAge} min.`;
        if (oldestAge > (device.maxDelayMinutes || MAXIMUM_AGE_MINUTES)) {
            latestUpdateElement.innerHTML = "Délais:</br>anormal";
            latestUpdateElement.style.color = "FireBrick";
        } else {
            latestUpdateElement.innerHTML = "Délais:</br>normal";
            latestUpdateElement.style.color = "white";
        }

    });
    } catch (err) {
        console.error('Error in displayDevices:', err);
    }
}

function getMinutesAgo(date) {
    return Math.abs((Date.now() - new Date(date).getTime()) / 1000 / 60);
}

function displayValves() {
    valves.forEach(async function (valve) {
        let positionElem;
        let positionElemId = "valve_" + valve.code + "_position";
        let valveElemId = "valve_" + valve.code;
        if (document.getElementById(valveElemId) == null) {
            let valveElem = document.createElement("tr");
            valveElem.setAttribute("id", valveElemId);
            if (
                valve.code.includes("A") ||
                valve.code.includes("ES") ||
                valve.code.includes("DPH")
            ) {
                valveElem.style.fontWeight = "bold";
                // const relayState = await readDeviceVariable(deviceId, varName);
                // console.log(`Valve  '${valve.code}' state is: `, thisState);
            }

            document.getElementById("valvelist").appendChild(valveElem);

            let codeElement = document.createElement("td");
            codeElement.innerHTML = valve.code;
            codeElement.setAttribute("class", "darker");
            valveElem.appendChild(codeElement);

            positionElem = document.createElement("td");
            positionElem.setAttribute("id", positionElemId);
            valveElem.appendChild(positionElem);
        } else {
            positionElem = document.getElementById(positionElemId);
        }
        positionElem.innerHTML = valve.position;
        setIndicatorColor(positionElem, valve.position);
        // Copy valve VaEC postion to Autres Valves table
        if (valve.code == "VaEC") {
            let VaECElemId = valve.code + "_position";
            let VaECElem = document.getElementById(VaECElemId);
            if (typeof VaECElem !== "undefined" && VaECElem !== null) {
                VaECElem.innerHTML = valve.position;
                setIndicatorColor(VaECElem, valve.position);
                const VaECElemRow = document.getElementById("valve_" + valve.code);
                setAgeColor(VaECElemRow, valve.device);
            }
        }
        // Copy valve VaTk postion to Autres Valves table
        if (valve.code == "VaTk") {
            let VaTkElemId = valve.code + "_position";
            let VaTkElem = document.getElementById(VaTkElemId);
            if (typeof VaTkElem !== "undefined" && VaTkElem !== null) {
                VaTkElem.innerHTML = valve.position;
                setIndicatorColor(VaTkElem, valve.position);
                const VaTkElemRow = document.getElementById("valve_" + valve.code);
                setAgeColor(VaTkElemRow, valve.device);
            }
        }
    });
}

function displaySiteNameOrError(errNo, err) {
    let thisSiteNameElement = document.getElementById("siteName");
    if (errNo < 0) {
        thisSiteNameElement.innerHTML = "Alarme Osmose: " + err;
        thisSiteNameElement.style.backgroundColor = "red";
    } else {
        thisSiteNameElement.innerHTML = "";
        thisSiteNameElement.style = "display: inline-block;";
    }
}

function displayOsmose() {
    osmose.forEach(function (osm) {
        const stateElemId = "Osmose" + "_state";
        const stateElem = document.getElementById(stateElemId);
        if (osm.state == 1) {
            stateElem.innerHTML = "ON";
            stateElem.style.backgroundColor = "lime";
        } else {
            stateElem.innerHTML = "OFF";
            stateElem.style.backgroundColor = "red";
        }

        const fonctionElemId = "Osmose" + "_fonction";
        const fonctionElem = document.getElementById(fonctionElemId);
        fonctionElem.innerHTML =
            osm.fonction !== undefined ? osm.fonction : "   -indéfini-   ";
        const alarmCodeElemId = "Osmose" + "_alarmNo";
        const alarmCodeElem = document.getElementById(alarmCodeElemId);
        if (osm.alarmNo !== undefined) {
            alarmCodeElem.innerHTML = osm.alarmNo;
        } else {
            alarmCodeElem.innerHTML = "";
        }

        const alarmMsgElemId = "Osmose_alarmMsg";
        const alarmMsgElem = document.getElementById(alarmMsgElemId);
        if (osm.alarmMsg !== undefined) {
            alarmMsgElem.innerHTML = osm.alarmMsg;
        } else {
            alarmMsgElem.innerHTML = "";
        }

        if (osm.alarmNo < 0) {
            alarmMsgElem.style.backgroundColor = "orange";
        } else {
            alarmMsgElem.style.backgroundColor = "#e0e0e0"; // gris
        }
        displaySiteNameOrError(osm.alarmNo, osm.alarmMsg);

        const seqElemId = "Osmose" + "_sequence";
        const seqElem = document.getElementById(seqElemId);
        if (osm.sequence !== undefined) {
            seqElem.innerHTML = osm.sequence;
        } else {
            seqElem.innerHTML = "?-?-?-?";
        }

        const runTimeElemId = "Osmose" + "_tOperEC";
        const runTimeElem = document.getElementById(runTimeElemId);
        runTimeElem.innerHTML = secToHrMin(osm.TempsOperEnCour);

        const rtSeq1234ElemId = "Osmose" + "_TempsSeq1234";
        const rtSeq1234Elem = document.getElementById(rtSeq1234ElemId);
        rtSeq1234Elem.innerHTML = secToHrMin(osm.TempsSeq1234);

        const rtSeq4321ElemId = "Osmose" + "_TempsSeq4321";
        const rtSeq4321Elem = document.getElementById(rtSeq4321ElemId);
        rtSeq4321Elem.innerHTML = secToHrMin(osm.TempsSeq4321);

        const tdLavageElemId = "Osmose" + "_TempsDepuisLavage";
        const tdLavageElem = document.getElementById(tdLavageElemId);
        tdLavageElem.innerHTML = secToHrMin(osm.TempsDepuisLavage);

        const miseAJourElemId = "Osmose" + "_lastUpdatedAt";
        const miseAJourElem = document.getElementById(miseAJourElemId);
        const ageInMinutes = Math.floor(
            getMinutesAgo(new Date(osm.lastUpdatedAt)),
        );
        miseAJourElem.innerHTML = ageInMinutes + " min.";

        const col1ElemId = "Osmose" + "_Col1";
        const col1Elem = document.getElementById(col1ElemId);
        if (osm.Col1 !== undefined) {
            col1Elem.innerHTML = osm.Col1.toFixed(1);
        } else {
            col1Elem.innerHTML = 0.0;
        }

        const col2ElemId = "Osmose" + "_Col2";
        const col2Elem = document.getElementById(col2ElemId);
        if (osm.Col2 !== undefined) {
            col2Elem.innerHTML = osm.Col2.toFixed(1);
        } else {
            col2Elem.innerHTML = 0.0;
        }

        const col3ElemId = "Osmose" + "_Col3";
        const col3Elem = document.getElementById(col3ElemId);
        if (osm.Col3 !== undefined) {
            col3Elem.innerHTML = osm.Col3.toFixed(1);
        } else {
            col3Elem.innerHTML = 0.0;
        }

        const col4ElemId = "Osmose" + "_Col4";
        const col4Elem = document.getElementById(col4ElemId);
        if (osm.Col4 !== undefined) {
            col4Elem.innerHTML = osm.Col4.toFixed(1);
        } else {
            col4Elem.innerHTML = 0.0;
        }

        const concElemId = "Osmose" + "_Conc";
        const concElem = document.getElementById(concElemId);
        if (osm.Conc !== undefined) {
            concElem.innerHTML = osm.Conc.toFixed(1);
        } else {
            concElem.innerHTML = 0.0;
        }

        const TempElemId = "Osmose" + "_Temp";
        const TempElem = document.getElementById(TempElemId);
        if (osm.Temp !== undefined) {
            TempElem.innerHTML = osm.Temp.toFixed(1);
        } else {
            TempElem.innerHTML = 0.0;
        }

        const PresElemId = "Osmose" + "_Pres";
        const PresElem = document.getElementById(PresElemId);
        if (osm.Pres !== undefined) {
            PresElem.innerHTML = osm.Pres;
        } else {
            PresElem.innerHTML = 0;
        }

        const brixSeveElemId = "Osmose" + "_BrixSeve";
        const brixSeveElem = document.getElementById(brixSeveElemId);
        if (osm.Pres !== undefined) {
            brixSeveElem.innerHTML = osm.BrixSeve.toFixed(1);
        } else {
            brixSeveElem.innerHTML = 1.0;
        }

        const brixConcElemId = "Osmose" + "_BrixConc";
        const brixConcElem = document.getElementById(brixConcElemId);
        if (osm.BrixConc !== undefined) {
            brixConcElem.innerHTML = osm.BrixConc.toFixed(1);
        } else {
            brixConcElem.innerHTML = 10.0;
        }

        const pcConcElemId = "Osmose" + "_PC_Conc";
        const pcConcElem = document.getElementById(pcConcElemId);
        if (osm.PC_Conc !== undefined) {
            pcConcElem.innerHTML = osm.PC_Conc;
        } else {
            pcConcElem.innerHTML = 0;
        }

        const gphConcElemId = "Osmose" + "_Conc_GPH";
        const gphConcElem = document.getElementById(gphConcElemId);
        if (osm.Conc_GPH !== undefined) {
            gphConcElem.innerHTML = osm.Conc_GPH;
        } else {
            gphConcElem.innerHTML = 0;
        }

        const gphFiltratElemId = "Osmose" + "_Filtrat_GPH";
        const gphFiltratElem = document.getElementById(gphFiltratElemId);
        if (osm.Filtrat_GPH !== undefined) {
            gphFiltratElem.innerHTML = osm.Filtrat_GPH;
        } else {
            gphFiltratElem.innerHTML = 0;
        }

        const gphTotalElemId = "Osmose" + "_Total_GPH";
        const gphTotalElem = document.getElementById(gphTotalElemId);
        if (osm.Total_GPH !== undefined) {
            gphTotalElem.innerHTML = osm.Total_GPH;
        } else {
            gphTotalElem.innerHTML = 3000;
        }

        const dureeElemId = "Osmose" + "_Durée_sec";
        const dureeElem = document.getElementById(dureeElemId);
        if (osm.runTimeSec !== undefined) {
            dureeElem.innerHTML = secToHrMin(osm.runTimeSec);
        } else {
            dureeElem.innerHTML = "";
        }

        const tempApproxElemId = "Osmose" + "_temps_approx";
        const tempApproxElem = document.getElementById(tempApproxElemId);
        const tempEstim = calcTempEst();
        tempApproxElem.innerHTML = secToHrMin(tempEstim);
    });
}

function calcTempEst() {
    try {
        let tempsEst = 24 * 3600; // Default to 24 hours
        const debitOsmoseElem = document.getElementById("Osmose_Total_GPH");
        const débitPompesElem = document.getElementById("pumptotalrate");
        const volumeSeveElem = document.getElementById("RStot");
        
        if (!debitOsmoseElem || !débitPompesElem || !volumeSeveElem) {
            return tempsEst;
        }
        
        const debitOsmose = parseFloat(debitOsmoseElem.innerHTML);
        const débitPompes = parseFloat(débitPompesElem.innerHTML);
        const volumeSeve = parseFloat(volumeSeveElem.innerHTML);
        
        if (!isNaN(debitOsmose) && !isNaN(débitPompes) && !isNaN(volumeSeve)) {
            const debitReel = debitOsmose - débitPompes;
            if (debitReel > 0) {
                tempsEst = (3600 * volumeSeve) / debitReel;
            }
        }
        return tempsEst;
    } catch (err) {
        console.error('Error calculating time estimate:', err);
        return 24 * 3600; // Return 24 hours as fallback
    }
}

function secToHrMin(totalSec) {
    totalSec = Math.max(0, totalSec);
    let hour = totalSec / 3600;
    let min = (hour - Math.floor(hour)) * 60;
    let sec = min - Math.floor(min);
    hour = Math.floor(hour);
    min = Math.floor(min);
    sec = Math.floor(sec);
    return hour + "h " + min + "m";
}

function displayPumps() {
    let totalRate = 0;
    let totalVolume = 0;
    let pumpDuty = 0;
    let dateStart;
    const allWaterPumps = [false, false, false];

    pumps.forEach(function (pump) {
        const pumpElemId = `pump_${pump.code}`;
        const stateElemId = `${pumpElemId}_state`;
        const dutyElemId = `${pumpElemId}_duty`;
        const rateElemId = `${pumpElemId}_rate`;
        const volumeElemId = `${pumpElemId}_volume`;

        let pumpElem = document.getElementById(pumpElemId);
        if (!pumpElem) {
            pumpElem = document.createElement("tr");
            pumpElem.setAttribute("id", pumpElemId);
            const totalRow = document.getElementById("pumptotalrow");
            totalRow.parentElement.insertBefore(pumpElem, totalRow);

            // Création des cellules via createCell
            createCell(null, "pumpcode", pumpElem).innerHTML = pump.code;
            createCell(stateElemId, "pumpstate", pumpElem);
            createCell(dutyElemId, "pumpduty", pumpElem);
            createCell(rateElemId, "pumprate", pumpElem);
            createCell(volumeElemId, "pumpvolume", pumpElem);
        }

        const stateElem = document.getElementById(stateElemId);
        const dutyElem = document.getElementById(dutyElemId);
        const rateElem = document.getElementById(rateElemId);
        const volumeElem = document.getElementById(volumeElemId);

        setPumpWarning(pumpElem, pump.run2long);

        if (pump.code.includes("PV")) {
            const pvid = `val_${pump.device}`;
            const PVvacId = document.getElementById(pvid);
            if (PVvacId) {
                if (pump.state === true || PVvacId.innerHTML < -10) {
                    pump.state = true;
                } else if (PVvacId.innerHTML > -5) {
                    pump.state = false;
                }
            }
        }

        stateElem.innerHTML = pump.state ? "ON" : "OFF";
        stateElem.style.color = "black";
        setIndicatorColor(stateElem, pump.state);

        const rate =
            pump.duty && pump.duty > 0
                ? (3600 * pump.Volume_Relacheur) / pump.OFFtime
                : 0;
        const volume = pump.volume !== undefined ? Math.abs(pump.volume) : 0;

        if (["P1", "P2", "P3"].includes(pump.code)) {
            totalRate += rate;
            totalVolume += volume;
            pumpDuty = (pump.duty * 100).toFixed(1);
            dutyElem.innerHTML = parseFloat(pumpDuty) || "";
            rateElem.innerHTML = parseInt(rate) || "";
            volumeElem.innerHTML = parseInt(volume) || "";

            // Enregistrer l'état des pompes
            const pumpIndex = ["P1", "P2", "P3"].indexOf(pump.code);
            if (pump.couleeEnCour !== undefined && pumpIndex >= 0) {
                allWaterPumps[pumpIndex] = pump.couleeEnCour;
                if (allWaterPumps[pumpIndex]) {
                    dateStart = pump.debutDeCouleeTS;
                }
            }
        }

        setAgeColor(document.getElementById(`pump_${pump.code}`), pump.device);
    });

    checkCouleeEnCour(allWaterPumps, dateStart);

    const totalRateElem = document.getElementById("pumptotalrate");
    totalRateElem.innerHTML = parseInt(totalRate) || 0;

    const totalVolumeElem = document.getElementById("volumetotal");
    totalVolumeElem.innerHTML = parseInt(totalVolume) || 0;

    const seveBrix = document.getElementById("Osmose_BrixSeve").innerHTML;
    let debitSirop = (seveBrix * totalRate) / SYRUP_BRIX;
    debitSirop = isNaN(debitSirop) ? 0 : debitSirop;

    let totalSirop = (seveBrix * totalVolume) / SYRUP_BRIX;

    const SiropElem = document.getElementById("estimSirop");
    SiropElem.innerHTML = totalSirop.toFixed(0) || 0;

    const debitSiropElem = document.getElementById("debitEstimSirop");
    debitSiropElem.innerHTML = debitSirop.toFixed(1) || 0.0;
}

function checkCouleeEnCour(allWaterPumps, dateStart) {
    // console.log(JSON.stringify(allWaterPumps));
    const couleeElem = document.getElementById("coulee");
    const couleeTextElem = document.getElementById("c_text");
    const allPumpsCouleeState =
        allWaterPumps[0] || allWaterPumps[1] || allWaterPumps[2];

    if (allPumpsCouleeState !== undefined && couleeActive !== undefined) {
        if (allPumpsCouleeState !== couleeActive) {
            // Changement d'état
            if (allPumpsCouleeState == true) {
                // console.log("startCouleeCounter: allPumpsCouleeState= " + allPumpsCouleeState + ", couleeActive= " + couleeActive);
                couleeActive = allPumpsCouleeState;
                startCouleeCounter(dateStart);
                couleeTextElem.innerHTML = "Coulée:  ";
                couleeTextElem.style.color = "black";
                couleeElem.style.backgroundColor = "yellow";
                couleeElem.style.color = "black";
            } else {
                // console.log("   STOPCouleeCounter: allPumpsCouleeState= " + allPumpsCouleeState + ", couleeActive= " + couleeActive);
                couleeActive = allPumpsCouleeState;
                stopCouleeCounter();
                couleeTextElem.innerHTML = "Terminée:  ";
                couleeElem.style.backgroundColor = "#9E9E9E";
            }
        }
    }
}

function displayVacuumLignes() {
    vacuums.forEach(function (vacuum) {
        let vacuumValue = 0;
        let vacuumDrop = 0;

        const vacuumElemId = `vacuum_${vacuum.code}`;
        const valueElemId = `${vacuumElemId}_value`;
        const deltaVacElemId = `${vacuumElemId}_deltaVac`;
        const tempElemId = `${vacuumElemId}_temp`;
        const chargeElemId = `${vacuumElemId}_percentCharge`;
        const vacRefElemId = `${vacuumElemId}_ref`;
        const updatedElemId = `${vacuumElemId}_lastUpdate`;

        let vacuumElem = document.getElementById(vacuumElemId);
        const skippedVacuumCodes = [
            "V1", "V2", "V3",
            "PV1", "PV2", "PV3",
            "EB-V1", "EB-V2", "EB-V3",
        ];
        let skipped = skippedVacuumCodes.includes(vacuum.code);
        if (!vacuumElem && !skipped) {
            vacuumElem = document.createElement("tr");
            vacuumElem.setAttribute("id", vacuumElemId);
            document.getElementById("vacuumlist").appendChild(vacuumElem);

            // Création des cellules via la fonction utilitaire
            createCell(null, "vacuumcode", vacuumElem).innerHTML = vacuum.label;
            createCell(valueElemId, "vacuumtemp", vacuumElem);
            createCell(vacRefElemId, "vacuumtemp", vacuumElem);
            createCell(deltaVacElemId, "vacuumtemp", vacuumElem);
            createCell(tempElemId, "vacuumtemp", vacuumElem);
            createCell(chargeElemId, "vacuumtemp", vacuumElem);
            const updatedCell = createCell(
                updatedElemId,
                "vacuumtemp",
                vacuumElem,
            );
            updatedCell.style.visibility = "visible";
        }

        // Mise à jour des valeurs dynamiques
        const valueElem = document.getElementById(valueElemId);
        const deltaVacElem = document.getElementById(deltaVacElemId);
        const tempElem = document.getElementById(tempElemId);
        const chargeElem = document.getElementById(chargeElemId);
        const vacRefElem = document.getElementById(vacRefElemId);
        let updatedElem = document.getElementById(updatedElemId);

        vacuumValue = vacuum.rawValue;

        // Calcul des pertes de vide
        if (skippedVacuumCodes.includes(vacuum.code)) {
            return;
        }
        if (vacuumValue == undefined) vacuumValue = 0.0;
        vacuumDrop = vacuumValue - vacuum.ref;
        valueElem.innerHTML = vacuumValue.toFixed(1);
        valueElem.style.textAlign = "right";

        deltaVacElem.innerHTML = vacuumDrop.toFixed(1);
        deltaVacElem.style.textAlign = "right";
        deltaVacElem.style.backgroundColor = setVacuumDropColor(vacuumDrop);

        if ("temp" in vacuum) {
            tempElem.innerHTML = vacuum.temp.toFixed(1);
            tempElem.style.textAlign = "right";
        }

        if ("percentCharge" in vacuum) {
            chargeElem.innerHTML = vacuum.percentCharge.toFixed(0);
            chargeElem.style.textAlign = "right";
            chargeElem.style.backgroundColor = setBatteryColorLineVacuum(
                vacuum.percentCharge,
            );
        }

        if ("ref" in vacuum) {
            if (typeof vacuum.ref === "number") {
                vacRefElem.innerHTML = vacuum.ref.toFixed(1);
                vacRefElem.style.textAlign = "right";
            }
        }

        if ("lastUpdatedAt" in vacuum) {
            if (vacuum.device === undefined) return;

            const ageInMinutes = Math.floor(
                getMinutesAgo(new Date(vacuum.lastUpdatedAt)),
            );
            const ageDisplay =
                ageInMinutes === 0 ? "now" : `${ageInMinutes} min.`;

            updatedElem.innerHTML = ageDisplay;
            updatedElem.style.textAlign = "right";
        }
        vacuumElem = document.getElementById("vacuum_" + vacuum.code);

        if (vacuumElem !== null) {
            setAgeColor(vacuumElem, vacuum.device);
        }
        updatedElem = document.getElementById(updatedElemId);

        if (vacuum.device === "POMPE 1" && vacuum.lastUpdatedAt !== undefined) {
            let updateTime = new Date(vacuum.lastUpdatedAt);
            const TableElem = document.getElementById("VacuumDatacerName");
            TableElem.innerHTML =
                "Datacer Vacuums: " + updateTime.toLocaleTimeString();
        }
    });
}

// Affichage des pompes et relâcheurs dans les première lignes du tableau Vacuum
function displayVacuumErabliere() {
    let videElemId;
    let videElem;
    let videValElemId;
    let videValElem;
    let vacValue = 0;
    let timeElemId;
    let timeElem;
    let tOper = 0;

    vacuums.forEach(function (vacuum) {
        // if (vacuum.label.indexOf("Ligne") !== 0) return;
        if (
            ![
                "POMPE 1",
                "POMPE 2",
                "POMPE PUMP HOUSE",
                "EB-V1",
                "EB-V2",
                "EB-V3",
            ].includes(vacuum.device)
        ) {
            return;
        }

        const videElemId = `name_${vacuum.device}`;
        const videValElemId = `val_${vacuum.device}`;
        const timeElemId = `tOper_${vacuum.device}`;

        videElem = document.getElementById(videElemId);
        if (videElem !== null) {
            videElem.innerHTML = vacuum.device;
            // setAgeColor(videElem, vacuum.device);
        }
        videValElem = document.getElementById(videValElemId);
        vacValue = vacuum.rawValue;
        if (
            videValElem !== null &&
            vacValue !== undefined &&
            vacValue !== null
        ) {
            videValElem.innerHTML = vacValue.toFixed(1) || 0.0;
            videValElem.style.textAlign = "right";
        }
        timeElem = document.getElementById(timeElemId);
        if (timeElem !== null) {
            timeElem.style.textAlign = "center";
            if (vacuum.RunTimeSinceMaint !== undefined) {
                timeElem.innerHTML = secToHrMin(vacuum.RunTimeSinceMaint);
                // console.log("RunTimeSinceMaint: ", vacuum.RunTimeSinceMaint);
                if (vacuum.NeedMaintenance == true) {
                    if (vacuum.RunTimeSinceMaint < ALARM_LIMIT_SECONDS) {
                        timeElem.className = "warning";
                    } else {
                        timeElem.className = "alarm";
                    }
                } else {
                    timeElem.className = "lighter";
                }
            } else {
                timeElem.innerHTML = "";
            }
        }
    });
}

function setIndicatorColor(IndicatorElem, IndicatorValue) {
    if (IndicatorValue == "Ouvert" || IndicatorValue == "Ouverte") {
        IndicatorElem.style.backgroundColor = "lime"; // Vert lime
    } else if (IndicatorValue == "Fermé") {
        IndicatorElem.style.backgroundColor = "#ff3f3f"; // Rouge
    } else if (IndicatorValue == "Partiel") {
        IndicatorElem.style.backgroundColor = "yellow"; // Jaune
    } else if (IndicatorValue == "Erreur") {
        IndicatorElem.style.backgroundColor = "#bfbfff"; // Bleu
    } else if (IndicatorValue == "OFF" || IndicatorValue == false) {
        IndicatorElem.style.backgroundColor = "#ff3f3f"; // Rouge
    } else if (IndicatorValue == "ON" || IndicatorValue == true) {
        IndicatorElem.style.backgroundColor = "lime"; // Vert
    }
}

function setPumpWarning(deviceElem, warningState) {
    if (warningState) {
        deviceElem.style.backgroundColor = "orange"; // Alerte orange
    } else {
        deviceElem.style.backgroundColor = "silver"; // Alerte orange
    }
}

function setAgeColor(displayElem, deviceDevice) {
    if (deviceDevice === undefined) {
        return;
    }
    try {
        let lastUpdatedAtElemId = "device_" + deviceDevice + "_lastUpdatedAt";
        let lastUpdatedAtElem = document.getElementById(lastUpdatedAtElemId);
        if (lastUpdatedAtElem !== null && lastUpdatedAtElem !== undefined &&
            displayElem !== null && displayElem !== undefined) {
            displayElem.style.color = lastUpdatedAtElem.style.color;
        }
    } catch (err) {
        console.log("lastUpdatedAtElemId: " + deviceDevice + " " + err);
    }
}

function setAgeLineVacuum(displayElem, deviceDevice) {
    if (deviceDevice === undefined) {
        return;
    }
    try {
        let lastUpdatedAtElemId = "device_" + deviceDevice + "_lastUpdatedAt";
        let lastUpdatedAtElem = document.getElementById(lastUpdatedAtElemId);
        if (lastUpdatedAtElem !== null && lastUpdatedAtElem !== undefined &&
            displayElem !== null && displayElem !== undefined) {
            displayElem.innerHTML = lastUpdatedAtElem.innerHTML;
        }
    } catch (err) {
        console.log("lastUpdatedAtElemId: " + deviceDevice + " " + err);
    }
}

function setBatteryColorLineVacuum(percentCharge) {
    try {
        if (percentCharge >= BATTERY_NORMAL_THRESHOLD) {
            return "#e6e6e6"; // Light gray - Normal
        } else if (percentCharge >= BATTERY_LOW_THRESHOLD) {
            return "Orange"; // Orange - Low
        } else {
            return "Red"; // Red - Critical
        }
    } catch (err) {
        console.log("Erreur: " + err);
        return "#e6e6e6"; // Default color
    }
}
function setVacuumDropColor(vacuumDrop) {
    try {
        if (vacuumDrop < VACUUM_DROP_YELLOW_LIMIT) {
            return "lime";
        } else if (vacuumDrop < VACUUM_DROP_RED_LIMIT) {
            return "yellow";
        } else {
            return "red";
        }
    } catch (err) {
        console.log("Erreur: " + err);
    }
}

function toggleTablesVisibility(thisTable) {
    const TableElem = document.getElementById(thisTable);
    if (TableElem.style.visibility == "hidden") {
        TableElem.style.visibility = "visible";
    } else if (TableElem.style.visibility == "visible") {
        TableElem.style.visibility = "hidden";
    }
}

// Toggle status color
function toggleStatusColor() {
    const statusElem = document.getElementById("lastestUpdate");
    statusElem.style.backgroundColor =
        statusElem.style.backgroundColor == "" ? "#4CAF50" : "";
    setTimeout(function () {
        statusElem.style.backgroundColor =
            statusElem.style.backgroundColor == "" ? "#4CAF50" : "";
    }, 500);
}

function openSocket() {
    let firstLoop = true;
    websocket = new WebSocket(wsUri(""), "dashboard-stream");
    websocket.onopen = function (evt) {
        console.log("Socket opened.");
    };
    websocket.onclose = function (evt) {
        console.log("Socket closed.");
        setTimeout(function () {
            openSocket();
        }, WEBSOCKET_RECONNECT_DELAY_MS);
    };
    websocket.onmessage = function (msg) {
        try {
            const data = JSON.parse(msg.data);
        tankDefs.forEach(function (tankDef, index) {
            const tank = data.tanks
                .filter(function (tankData) {
                    return tankData.code == tankDef.code;
                })
                .shift();
            tankDef.device = tank.device;
            tankDef.rawValue = tank.rawValue;
            tankDef.contents = tank.fill == null ? 0 : tank.fill;
            tankDef.capacity = tank.capacity;
            tankDef.output = tank.output;
            tankDef.drain = tank.drain;
            tankDef.ssrRelay = tank.ssrRelay;
            // console.log("Tank %s at %d: %s, raw= %s", tankDef.code, index, tankDef.contents, tankDef.rawValue);
            devices = data.devices;
            valves = data.valves;
            vacuums = data.vacuums; // First list of vacuum devices devices
            pumps = data.pumps;
            osmose = data.osmose;
            myToken = data.token;
            valveSelectorPassword = data.valveSelectorPassword;
        });
        displayDevices();
        displayValves();
        displayTanks();
        displayPumps();
        displayOsmose();
        displayVacuumErabliere();
        displayVacuumLignes();
        toggleStatusColor();
        } catch (err) {
            console.error("Error processing WebSocket message:", err);
        }
    };
    websocket.onerror = function (evt) {
        console.error("Error:" + evt);
    };
}

let sec = 0;
let couleTimer;

function pad(val) {
    return val > 9 ? val : "0" + val;
}

function startCouleeCounter(date) {
    // console.log("Début de coulée: " + formatDate(date, false));
    console.log("Début de coulée: " + date);
    if (date !== undefined) {
        couleTimer = setInterval(function () {
            sec = parseInt(
                Math.abs(Date.now() / 1e3 - new Date(date).getTime()),
            );
            let timeStr = "</br>" + parseInt(sec / 86400, 10);
            timeStr = timeStr + "j " + pad(parseInt(sec / 3600, 10) % 24);
            timeStr = timeStr + "h " + pad(parseInt(sec / 60, 10) % 60);
            timeStr = timeStr + "m " + pad(sec % 60) + "s";
            document.getElementById("compteurDeTemps").innerHTML = timeStr;
        }, 1000);
    } else {
        document.getElementById("compteurDeTemps").innerHTML =
            "</br>Début inconnu";
    }
}

function stopCouleeCounter() {
    clearInterval(couleTimer);
    document.getElementById("compteurDeTemps").innerHTML = "";
}

function getDeviceId(devName) {
    try {
        const device = devices
            .filter(function (d) {
                return d.name === devName;
            })
            .shift();
        return device ? device.id : null;
    } catch (err) {
        console.error(`Error getting device ID for ${devName}:`, err);
        return null;
    }
}

function getRelayState(devName) {
    try {
        const device = devices
            .filter(function (d) {
                return d.name === devName;
            })
            .shift();
        return device ? device.ssrRelayState : undefined;
    } catch (err) {
        console.error(`Error getting relay state for ${devName}:`, err);
        return undefined;
    }
}

function callResetOperTimer(devName) {
    let text;
    if (confirm("Remettre à zéro le compteur?") == true) {
        const res = callFunction(getDeviceId(devName), "reset", "operationTimer");
        if (res != -1) {
            text = "Remise à zéro CONFIRMÉ!";
        } else {
            text = "Erreur";
        }
        alert(text);
    } else {
        alert("Remise à zéro ANNULÉ!");
    }
}

async function readDeviceVariable(deviceId, varName) {
    try {
        if (!deviceId || !varName || !myToken) {
            throw new Error('Missing required parameters');
        }
        const data = await particle.getVariable({
            deviceId: deviceId,
            name: varName,
            auth: myToken,
        });
        console.log(
            `Successfully read variable '${varName}' from device '${deviceId}':`,
            data.result,
        );
        return data.result;
    } catch (err) {
        console.error(
            `Error reading variable '${varName}' from device '${deviceId}':`,
            err,
        );
        return undefined;
    }
}

async function callFunction(devID, fname, fargument) {
    try {
        if (!devID || !fname || !myToken) {
            throw new Error('Missing required parameters');
        }
        const status = await particle
            .callFunction({
                deviceId: devID,
                name: fname,
                argument: fargument,
                auth: myToken,
            })
            .then(
                function (data) {
                    console.log("Function called successfully:", data);
                    return data;
                },
                function (err) {
                    console.error("An error occurred:", err);
                    throw err;
                },
            );
        return status;
    } catch (err) {
        console.error(`Error calling function ${fname} on device ${devID}:`, err);
        return null;
    }
}

setTimeout(function () {
    window.location.reload(1);
}, PAGE_RELOAD_INTERVAL_MS);

function normalizeLabel(label) {
    return label.replace(/([A-Z])0*/, "$1");
}

function formatDate(date, timeOnly = true) {
    let hours = date.getHours().toString().padStart(2, "0");
    let minutes = date.getMinutes().toString().padStart(2, "0");
    let seconds = date.getSeconds().toString().padStart(2, "0");
    
    if (!timeOnly) {
        let day = date.getDate().toString().padStart(2, "0");
        let month = (date.getMonth() + 1).toString().padStart(2, "0");
        let year = date.getFullYear();
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    return `${hours}:${minutes}:${seconds}`;
}

window.addEventListener("load", onLoad, false);
