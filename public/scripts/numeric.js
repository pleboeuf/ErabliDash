function wsUri(path) {
    var l = window.location;
    return (
        (l.protocol === "https:" ? "wss://" : "ws://") +
        l.hostname +
        (l.port != 80 && l.port != 443 ? ":" + l.port : "") +
        l.pathname +
        path
    );
}
var jsonElement;
var websocket;

// Note: Capacity in Liters
var tankDefs = [
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

var devices = [];
var valves = [];
var pumps = [];
var vacuums = [];
var osmose = [];
var couleeActive = false;
var tempAge = 0;
const maximumAge = 5;
var actualSiteName;
var valueRef = {};

function liters2gallons(liters) {
    return Math.ceil(liters / 4.54609188);
}

function onLoad() {
    openSocket();
    setInterval(displayDevices, 10000);
    var myURL = document.URL;
    var domaineStart = myURL.indexOf("://") + 3;
    var domaineEnd = myURL.lastIndexOf(":");
    var thisDomain = myURL.substring(domaineStart, domaineEnd);
    var thisSiteNameElement = document.getElementById("siteName");
    var prefix = thisSiteNameElement.innerHTML;
    // if (myURL.search("pl-net.duckdns.org:3300") >= 0 || myURL.search("http://localhost:3300") >= 0) {
    //     prefix = "Serveur Dev. • 'α'";
    // } else if (myURL.search("http://pl-net.duckdns.org:3300") >= 0) {
    // prefix = "Serveur Test • 'ß'";
    // } else {
    prefix = "Érablière&nbsp;Brunelle";
    // }
    // actualSiteName =  prefix + " • " + "(" + thisDomain + ")";
    actualSiteName = prefix;
    thisSiteNameElement.innerHTML = actualSiteName;
}

function displayTanks() {
    var RStotal = 0;
    var RStotalCap = 0;
    var RFtotal = 0;
    var RFtotalCap = 0;
    var RCtotal = 0;
    var RCtotalCap = 0;
    tankDefs.forEach(function (tank) {
        var tankElementId = "tank_" + tank.code;
        var tankElement = document.getElementById(tankElementId);
        var contentsElementId = tankElementId + "_contents";
        var contentsElement;
        var percentElementId = tankElementId + "_percent";
        var percentElement;
        var rawValueElementId = tankElementId + "_rawvalue";
        var rawValueElement;
        var capacityElementId = tankElementId + "_capacity";
        var capacityElement;
        var outputElementId = tankElementId + "_output";
        var outputElement;
        var drainElementId = tankElementId + "_drain";
        var drainElement;

        var RStotElement;
        var RStotPCElem;
        var RStoSiropElement;
        var RSdispElement;
        var RSmaxElement;

        var RFtotElement;
        var RFtotPCElement;
        var RFdispElement;
        var RFmaxElement;

        var RCtotElement;
        var RCtotPCElement;
        var RCtoSiropElement;
        var RCdispElement;
        var RCmaxElement;

        var SiropElement;

        if (tankElement == null) {
            tankElement = document.createElement("tr");
            tankElement.setAttribute("id", tankElementId);
            tankElement.setAttribute("class", "tank");

            // Add tank name
            var nameElement = document.createElement("td");
            nameElement.setAttribute("class", "tankname");
            nameElement.innerHTML = tank.code;
            if (tank.code == "RS5" || tank.code == "RS6") {
                nameElement.innerHTML = tank.code + " (ph)";
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
        var tankPercent = ((tank.contents / tank.capacity) * 100).toFixed(0);
        tankElement.setAttribute("data-percent", tankPercent);
        capacityElement.innerHTML = liters2gallons(tank.capacity);
        rawValueElement.innerHTML = tank.rawValue;
        percentElement.innerHTML = tankPercent + " % ";
        contentsElement.innerHTML = liters2gallons(tank.contents);
        if (tank.rawValue < 5) {
            contentsElement.innerHTML = "----";
        }

        // Create the pie chart
        var gaugeElement = document.createElement("span");
        gaugeElement.innerHTML = tankPercent + "/100";
        if (tank.code == "RHC") {
            gaugeElement.setAttribute("class", "fueltankgauge");
        } else {
            gaugeElement.setAttribute("class", "tankgauge");
        }
        gaugeElement.setAttribute(
            "data-peity",
            '{ "fill": ["black", "#eeeeee"], "innerRadius": 0, "radius": 8 }'
        );
        percentElement.appendChild(gaugeElement);

        // Copy the output valve state from the valve table
        if (tank.output !== "none" && tank.output !== undefined) {
            var outValveElemId = "valve_" + tank.output + "_position";
            var outValvePosElem = document.getElementById(outValveElemId);
            var outValvePos = outValvePosElem.innerHTML;
            if (typeof outValvePos !== null) {
                outputElement.innerHTML = outValvePos;
                setIndicatorColor(outputElement, outValvePos);
            }
        }

        // Copy the drain valve state from the valve table
        if (tank.drain !== "none" && tank.drain !== undefined) {
            var drainValveElemId = "valve_" + tank.drain + "_position";
            var drainValvePosElem = document.getElementById(drainValveElemId);
            var drainValvePos = drainValvePosElem.innerHTML;
            if (typeof drainValvePos !== null) {
                drainElement.innerHTML = drainValvePos;
                setIndicatorColor(drainElement, drainValvePos);
            }
        }
        // Set color of line based on device lastUpdatedAt
        var tankElem = document.getElementById("tank_" + tank.code);
        setAgeColor(tankElem, tank.device);

        var plusRF2Check = document.getElementById("CheckRF2");
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
            var seveBrix = document.getElementById("Osmose_BrixSeve").innerHTML;
            RStoSiropElement.innerHTML = ((RStotal * seveBrix) / 66.0).toFixed(
                0
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
            var concBrix = document.getElementById("Osmose_BrixConc").innerHTML;
            RCtoSiropElement.innerHTML = ((RCtotal * concBrix) / 66.0).toFixed(
                0
            );
            RCdispElement.innerHTML = (RCtotalCap - RCtotal).toFixed(0);
            RCmaxElement.innerHTML = RCtotalCap.toFixed(0);
            var seveBrix = document.getElementById("Osmose_BrixSeve").innerHTML;
            var SiropTotal = (
                (RStotal * seveBrix) / 66.0 +
                (RCtotal * concBrix) / 66.0
            ).toFixed(0);
            SiropElement.innerHTML = SiropTotal;
        }
    });
    $(".tankgauge").peity("pie", {
        fill: function (value, index, values) {
            if (index > 0) {
                return "#eeeeee";
            }
            if (values[0] > 90) {
                return "red";
            }
            if (values[0] > 75) {
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
            if (values[0] < 30) {
                return "orange";
            }
            if (values[0] < 15) {
                return "red";
            }
            return "green";
        },
    });
}

function functionPlusRF2() {
    var plusRF2Check = document.getElementById("CheckRF2");
    var RFsummaryNameElement = document.getElementById("RFsummaryName");
    if (CheckRF2.checked == true) {
        RFsummaryNameElement.innerHTML = "RF1";
    } else {
        RFsummaryNameElement.innerHTML = "RF1 + RF2";
    }
}

function displayDevices() {
    var oldestAge = 0;
    var ageDisplayTop = "";
    devices.forEach(function (device) {
        if (device.retired) {
            return;
        }
        var lastUpdatedAtElemId = "device_" + device.name + "_lastUpdatedAt";
        var generationElemId = "device_" + device.name + "_generationId";
        var serialElemId = "device_" + device.name + "_serial";
        var lastUpdatedAtElem;
        var deviceElemId = "device_" + device.name;
        if (document.getElementById(deviceElemId) == null) {
            var deviceElem = document.createElement("tr");
            deviceElem.setAttribute("id", deviceElemId);
            document.getElementById("devicelist").appendChild(deviceElem);

            var nameElement = document.createElement("td");
            nameElement.innerHTML = device.name;
            nameElement.setAttribute("class", "darker");
            deviceElem.appendChild(nameElement);

            lastUpdatedAtElem = document.createElement("td");
            lastUpdatedAtElem.setAttribute("id", lastUpdatedAtElemId);
            lastUpdatedAtElem.setAttribute("class", "lighter");
            deviceElem.appendChild(lastUpdatedAtElem);

            generationElem = document.createElement("td");
            generationElem.setAttribute("id", generationElemId);
            generationElem.setAttribute("class", "lighter");
            deviceElem.appendChild(generationElem);

            serialElem = document.createElement("td");
            serialElem.setAttribute("id", serialElemId);
            serialElem.setAttribute("class", "lighter rawvalue");
            deviceElem.appendChild(serialElem);
        } else {
            lastUpdatedAtElem = document.getElementById(lastUpdatedAtElemId);
            generationElem = document.getElementById(generationElemId);
            serialElem = document.getElementById(serialElemId);
        }
        var ageInMinutes = Math.floor(
            getMinutesAgo(new Date(device.lastUpdatedAt))
        );
        var ageDisplay = "?";
        if (ageInMinutes == 0) {
            ageDisplay = "now";
        } else if (ageInMinutes > 0) {
            ageDisplay = ageInMinutes + " min.";
        }
        if (ageInMinutes > device.maxDelayMinutes || ageDisplay == "?") {
            lastUpdatedAtElem.style.color = "FireBrick";
        } else {
            lastUpdatedAtElem.style.color = "black";
        }
        lastUpdatedAtElem.innerHTML = ageDisplay;
        generationElem.innerHTML = device.generationId;
        serialElem.innerHTML = device.lastEventSerial;

        // Display the yongest age at the top of the screen.
        // If more than 5 min. there's a problem.
        oldestAge = Math.max(ageInMinutes, oldestAge);
        ageDisplayTop = oldestAge + " min.";
        // console.log('oldestAge: ' + oldestAge + ', ageDisplayTop; ' + ageDisplayTop);
        var lastestUpdateElement = document.getElementById("lastestUpdate");
        if (oldestAge > device.maxDelayMinutes) {
            lastestUpdateElement.innerHTML = "Délais:</br>anormal";
            lastestUpdateElement.style.color = "FireBrick";
        } else {
            lastestUpdateElement.innerHTML = "Délais:</br>normal";
            lastestUpdateElement.style.color = "white";
        }

        // Display outside temperature if available on device RS1
        if (device.name.includes("RS1")) {
            var tempExtElem = document.getElementById("tempExt");
            if (typeof tempExtElem !== "undefined" && tempExtElem !== null) {
                if (
                    device.ambientTemp !== undefined &&
                    device.ambientTemp !== 99 &&
                    device.ambientTemp !== -127
                ) {
                    tempExtElem.innerHTML = device.ambientTemp + "°C";
                } else {
                    tempExtElem.innerHTML = "---°C";
                }
            }
        }
    });
}

function getMinutesAgo(date) {
    return Math.abs((Date.now() - new Date(date).getTime()) / 1000 / 60);
}

function displayValves() {
    valves.forEach(function (valve) {
        var positionElem;
        var positionElemId = "valve_" + valve.code + "_position";
        var valveElemId = "valve_" + valve.code;
        if (document.getElementById(valveElemId) == null) {
            var valveElem = document.createElement("tr");
            valveElem.setAttribute("id", valveElemId);
            document.getElementById("valvelist").appendChild(valveElem);

            var codeElement = document.createElement("td");
            codeElement.innerHTML = valve.code;
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
            var VaECElemId = valve.code + "_position";
            var VaECElem = document.getElementById(VaECElemId);
            if (typeof VaECElem !== "undefined" && VaECElem !== null) {
                VaECElem.innerHTML = valve.position;
                setIndicatorColor(VaECElem, valve.position);
                var VaECElem = document.getElementById("valve_" + valve.code);
                setAgeColor(VaECElem, valve.device);
            }
        }
        // Copy valve VaTk postion to Autres Valves table
        if (valve.code == "VaTk") {
            var VaTkElemId = valve.code + "_position";
            var VaTkElem = document.getElementById(VaTkElemId);
            if (typeof VaTkElem !== "undefined" && VaTkElem !== null) {
                VaTkElem.innerHTML = valve.position;
                setIndicatorColor(VaTkElem, valve.position);
                var VaTkElem = document.getElementById("valve_" + valve.code);
                setAgeColor(VaTkElem, valve.device);
            }
        }
    });
}

function displaySiteNameOrError(errNo, err) {
    var thisSiteNameElement = document.getElementById("siteName");
    if (errNo < 0) {
        thisSiteNameElement.innerHTML = "Alarme Osmose: " + err;
        thisSiteNameElement.style.backgroundColor = "red";
    } else {
        thisSiteNameElement.innerHTML = actualSiteName;
        thisSiteNameElement.style = "display: inline-block;";
    }
}

function displayOsmose() {
    osmose.forEach(function (osm) {
        var stateElem;
        var stateElemId = "Osmose" + "_state";
        stateElem = document.getElementById(stateElemId);
        if (osm.state == 1) {
            stateElem.innerHTML = "ON";
            stateElem.style.backgroundColor = "lime";
        } else {
            stateElem.innerHTML = "OFF";
            stateElem.style.backgroundColor = "red";
        }

        var fonctionElem;
        var fonctionElemId = "Osmose" + "_fonction";
        fonctionElem = document.getElementById(fonctionElemId);
        fonctionElem.innerHTML = osm.fonction;

        var alarmCodeElem;
        var alarmCodeElemId = "Osmose" + "_alarmNo";
        alarmCodeElem = document.getElementById(alarmCodeElemId);
        if (osm.alarmNo !== undefined) {
            alarmCodeElem.innerHTML = osm.alarmNo;
        } else {
            alarmCodeElem.innerHTML = "";
        }

        var alarmMsgElem;
        var alarmMsgElemId = "Osmose_alarmMsg";
        alarmMsgElem = document.getElementById(alarmMsgElemId);
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

        var seqElem;
        var seqElemId = "Osmose" + "_sequence";
        seqElem = document.getElementById(seqElemId);
        if (osm.sequence !== undefined) {
            seqElem.innerHTML = osm.sequence;
        } else {
            seqElem.innerHTML = "?-?-?-?";
        }

        var runTimeCodeElem;
        var runTimeElemId = "Osmose" + "_tOperEC";
        runTimeElem = document.getElementById(runTimeElemId);
        runTimeElem.innerHTML = secToHrMin(osm.TempsOperEnCour);

        var rtSeq1234CodeElem;
        var rtSeq1234ElemId = "Osmose" + "_TempsSeq1234";
        rtSeq1234Elem = document.getElementById(rtSeq1234ElemId);
        rtSeq1234Elem.innerHTML = secToHrMin(osm.TempsSeq1234);

        var rtSeq4321CodeElem;
        var rtSeq4321ElemId = "Osmose" + "_TempsSeq4321";
        rtSeq4321Elem = document.getElementById(rtSeq4321ElemId);
        rtSeq4321Elem.innerHTML = secToHrMin(osm.TempsSeq4321);

        var tdLavageCodeElem;
        var tdLavageElemId = "Osmose" + "_TempsDepuisLavage";
        tdLavageElem = document.getElementById(tdLavageElemId);
        tdLavageElem.innerHTML = secToHrMin(osm.TempsDepuisLavage);

        var miseAJourCodeElem;
        var miseAJourElemId = "Osmose" + "_lastUpdatedAt";
        miseAJourElem = document.getElementById(miseAJourElemId);
        var ageInMinutes = Math.floor(
            getMinutesAgo(new Date(osm.lastUpdatedAt))
        );
        miseAJourElem.innerHTML = ageInMinutes + " min.";

        var col1Elem;
        var col1ElemId = "Osmose" + "_Col1";
        col1Elem = document.getElementById(col1ElemId);
        if (osm.Col1 !== undefined) {
            col1Elem.innerHTML = osm.Col1.toFixed(1);
        } else {
            col1Elem.innerHTML = 0.0;
        }

        var col2Elem;
        var col2ElemId = "Osmose" + "_Col2";
        col2Elem = document.getElementById(col2ElemId);
        if (osm.Col2 !== undefined) {
            col2Elem.innerHTML = osm.Col2.toFixed(1);
        } else {
            col2Elem.innerHTML = 0.0;
        }

        var col3Elem;
        var col3ElemId = "Osmose" + "_Col3";
        col3Elem = document.getElementById(col3ElemId);
        if (osm.Col3 !== undefined) {
            col3Elem.innerHTML = osm.Col3.toFixed(1);
        } else {
            col3Elem.innerHTML = 0.0;
        }

        var col4Elem;
        var col4ElemId = "Osmose" + "_Col4";
        col4Elem = document.getElementById(col4ElemId);
        if (osm.Col4 !== undefined) {
            col4Elem.innerHTML = osm.Col4.toFixed(1);
        } else {
            col4Elem.innerHTML = 0.0;
        }

        var concElem;
        var concElemId = "Osmose" + "_Conc";
        concElem = document.getElementById(concElemId);
        if (osm.Conc !== undefined) {
            concElem.innerHTML = osm.Conc.toFixed(1);
        } else {
            concElem.innerHTML = 0.0;
        }

        var TempElem;
        var TempElemId = "Osmose" + "_Temp";
        TempElem = document.getElementById(TempElemId);
        if (osm.Temp !== undefined) {
            TempElem.innerHTML = osm.Temp.toFixed(1);
        } else {
            TempElem.innerHTML = 0.0;
        }

        var PresElem;
        var PresElemId = "Osmose" + "_Pres";
        PresElem = document.getElementById(PresElemId);
        if (osm.Pres !== undefined) {
            PresElem.innerHTML = osm.Pres;
        } else {
            PresElem.innerHTML = 0;
        }

        var brixSeveElem;
        var brixSeveElemId = "Osmose" + "_BrixSeve";
        brixSeveElem = document.getElementById(brixSeveElemId);
        if (osm.Pres !== undefined) {
            brixSeveElem.innerHTML = osm.BrixSeve.toFixed(1);
        } else {
            brixSeveElem.innerHTML = 1.0;
        }

        var brixConcElem;
        var brixConcElemId = "Osmose" + "_BrixConc";
        brixConcElem = document.getElementById(brixConcElemId);
        if (osm.BrixConc !== undefined) {
            brixConcElem.innerHTML = osm.BrixConc.toFixed(1);
        } else {
            brixConcElem.innerHTML = 10.0;
        }

        var pcConcElem;
        var pcConcElemId = "Osmose" + "_PC_Conc";
        pcConcElem = document.getElementById(pcConcElemId);
        if (osm.PC_Conc !== undefined) {
            pcConcElem.innerHTML = osm.PC_Conc;
        } else {
            pcConcElem.innerHTML = 0;
        }

        var gphConcElem;
        var gphConcElemId = "Osmose" + "_Conc_GPH";
        gphConcElem = document.getElementById(gphConcElemId);
        if (osm.Conc_GPH !== undefined) {
            gphConcElem.innerHTML = osm.Conc_GPH;
        } else {
            gphConcElem.innerHTML = 0;
        }

        var gphFiltratElem;
        var gphFiltratElemId = "Osmose" + "_Filtrat_GPH";
        gphFiltratElem = document.getElementById(gphFiltratElemId);
        if (osm.Filtrat_GPH !== undefined) {
            gphFiltratElem.innerHTML = osm.Filtrat_GPH;
        } else {
            gphFiltratElem.innerHTML = 0;
        }

        var gphTotalElem;
        var gphTotalElemId = "Osmose" + "_Total_GPH";
        gphTotalElem = document.getElementById(gphTotalElemId);
        if (osm.Total_GPH !== undefined) {
            gphTotalElem.innerHTML = osm.Total_GPH;
        } else {
            gphTotalElem.innerHTML = 3000;
        }

        var dureeElem;
        var dureeElemId = "Osmose" + "_Durée_sec";
        dureeElem = document.getElementById(dureeElemId);
        if (osm.runTimeSec !== undefined) {
            dureeElem.innerHTML = secToHrMin(osm.runTimeSec);
        } else {
            dureeElem.innerHTML = "";
        }

        var tempApproxElem;
        var tempApproxElemId = "Osmose" + "_temps_approx";
        tempApproxElem = document.getElementById(tempApproxElemId);
        var tempEstim = calcTempEst();
        tempApproxElem.innerHTML = secToHrMin(tempEstim);
    });
}

function calcTempEst() {
    var tempsEst;
    const debitOsmose = document.getElementById("Osmose_Total_GPH").innerHTML;
    const débitPompes = document.getElementById("pumptotalrate").innerHTML;
    const volumeSeve = document.getElementById("RStot").innerHTML;
    if (debitOsmose !== null && débitPompes !== null && volumeSeve !== null) {
        var debitReel = debitOsmose - débitPompes;
        if (debitReel > 0) {
            tempsEst = (3600 * volumeSeve) / debitReel;
        } else {
            tempsEst = 24 * 3600;
        }
    }
    return tempsEst;
}

function secToHrMin(totalSec) {
    var hour = Math.floor(totalSec / 3600);
    var min = Math.floor((totalSec - hour * 3600) / 60);
    const sec = totalSec - (hour * 3600 + min * 60);
    // return pad(hour) + "h " + pad(min) + "m";
    if (sec > 29) {
        min = min + 1;
    }
    if (min > 59) {
        hour = hour + 1;
    }
    return hour + "h " + min + "m";
}

function displayPumps() {
    var totalRate = 0;
    var totalVolume = 0;
    var gph = 0;
    var pumpDuty = 0;
    var dateStart;
    allWaterPumps = [false, false, false];
    pumps.forEach(function (pump) {
        var PV1vacId;
        var codeElement;
        var codeElementId = "pump_" + pump.code;
        var stateElem;
        var stateElemId = "pump_" + pump.code + "_state";
        var dutyElem;
        var dutyElemId = "pump_" + pump.code + "_duty";
        var rateElem;
        var rateElemId = "pump_" + pump.code + "_rate";
        var volumeElem;
        var volumeElemId = "pump_" + pump.code + "_volume";
        var pumpElemId = "pump_" + pump.code;
        var pumpElem = document.getElementById(pumpElemId);
        var SiropElem = document.getElementById("estimSirop");
        var debitSiropElem = document.getElementById("debitEstimSirop");
        if (document.getElementById(pumpElemId) == null) {
            var pumpElem = document.createElement("tr");
            pumpElem.setAttribute("id", pumpElemId);
            var totalRow = document.getElementById("pumptotalrow");
            totalRow.parentElement.insertBefore(pumpElem, totalRow);

            codeElement = document.createElement("td");
            codeElement.innerHTML = pump.code;
            pumpElem.setAttribute("class", "pumpcode");
            // pumpElem.setAttribute('class', 'darker');
            pumpElem.appendChild(codeElement);

            stateElem = document.createElement("td");
            stateElem.setAttribute("id", stateElemId);
            stateElem.setAttribute("class", "pumpstate");
            pumpElem.appendChild(stateElem);

            dutyElem = document.createElement("td");
            dutyElem.setAttribute("id", dutyElemId);
            dutyElem.setAttribute("class", "pumpduty");
            pumpElem.appendChild(dutyElem);

            rateElem = document.createElement("td");
            rateElem.setAttribute("id", rateElemId);
            rateElem.setAttribute("class", "pumprate");
            pumpElem.appendChild(rateElem);

            volumeElem = document.createElement("td");
            volumeElem.setAttribute("id", volumeElemId);
            volumeElem.setAttribute("class", "pumpvolume");
            pumpElem.appendChild(volumeElem);
        } else {
            stateElem = document.getElementById(stateElemId);
            dutyElem = document.getElementById(dutyElemId);
            rateElem = document.getElementById(rateElemId);
            volumeElem = document.getElementById(volumeElemId);
            SiropElem = document.getElementById("estimSirop");
            debitSiropElem = document.getElementById("debitEstimSirop");
        }
        setPumpWarning(pumpElem, pump.run2long);
        if (pump.code == "Vide1") {
            PV1vacId = document.getElementById("vacuum_PV1_value");
            if (PV1vacId !== null) {
                if (PV1vacId.innerHTML < -10) {
                    pump.state = true;
                }
            }
        }
        stateElem.innerHTML = pump.state ? "ON" : "OFF";
        setIndicatorColor(stateElem, pump.state);
        if (pump.duty !== undefined && pump.duty >= 0) {
            var rate = pump.duty * pump.capacity_gph;
        }
        if (pump.volume !== undefined && pump.volume >= 0) {
            var volume = Math.abs(pump.volume);
        }
        if (pump.code == "P1" || pump.code == "P2" || pump.code == "P3") {
            totalRate += rate;
            totalVolume += volume;
            pumpDuty = (pump.duty * 100).toFixed(1);
            dutyElem.innerHTML = parseFloat(pumpDuty) || "";
            rateElem.innerHTML = parseInt(rate) || "";
            volumeElem.innerHTML = parseInt(volume) || "";

            // Noter l'état de coulée des pompes.
            if (pump.couleeEnCour !== undefined) {
                if (pump.code == "P1") {
                    allWaterPumps[0] = pump.couleeEnCour;
                    if (allWaterPumps[0]) {
                        dateStart = pump.debutDeCouleeTS;
                    }
                } else if (pump.code == "P2") {
                    allWaterPumps[1] = pump.couleeEnCour;
                    if (allWaterPumps[1]) {
                        dateStart = pump.debutDeCouleeTS;
                    }
                } else if (pump.code == "P3") {
                    allWaterPumps[2] = pump.couleeEnCour;
                    if (allWaterPumps[2]) {
                        dateStart = pump.debutDeCouleeTS;
                    }
                }
            }
        }
        // Set color of line based on device lastUpdatedAt
        var codeElem = document.getElementById("pump_" + pump.code);
        setAgeColor(codeElem, pump.device);
    });
    checkCouleeEnCour(allWaterPumps, dateStart); // Gérer le message de coulée en cours
    var totalRateElem = document.getElementById("pumptotalrate");
    totalRateElem.innerHTML = parseInt(totalRate) || 0;
    var totalVolumeElem = document.getElementById("volumetotal");
    totalVolumeElem.innerHTML = parseInt(totalVolume) || 0;
    var seveBrix = document.getElementById("Osmose_BrixSeve").innerHTML;
    var debitSirop = (seveBrix * parseInt(totalRate)) / 66.0;
    var totalSirop = (seveBrix * parseInt(totalVolume)) / 66.0;
    SiropElem = document.getElementById("estimSirop");
    SiropElem.innerHTML = totalSirop.toFixed(0) || 0;
    debitSiropElem = document.getElementById("debitEstimSirop");
    debitSiropElem.innerHTML = debitSirop.toFixed(1) || 0.0;
}

function checkCouleeEnCour(allWaterPumps, dateStart) {
    // console.log(JSON.stringify(allWaterPumps));
    var couleeElem = document.getElementById("coulee");
    var couleeTextElem = document.getElementById("c_text");
    var allPumpsCouleeState =
        allWaterPumps[0] || allWaterPumps[1] || allWaterPumps[2];

    if (allPumpsCouleeState !== undefined && couleeActive !== undefined) {
        if (allPumpsCouleeState !== couleeActive) {
            // Changement d'état
            if (allPumpsCouleeState == true) {
                // console.log("startCouleeCounter: allPumpsCouleeState= " + allPumpsCouleeState + ", couleeActive= " + couleeActive);
                couleeActive = allPumpsCouleeState;
                startCouleeCounter(dateStart);
                couleeTextElem.innerHTML = "Coulée en cours:  ";
                couleeElem.style.backgroundColor = "yellow";
                couleeElem.style.color = "black";
            } else {
                // console.log("   STOPCouleeCounter: allPumpsCouleeState= " + allPumpsCouleeState + ", couleeActive= " + couleeActive);
                couleeActive = allPumpsCouleeState;
                stopCouleeCounter();
                couleeTextElem.innerHTML = "Coulée terminée:  ";
                couleeElem.style.backgroundColor = "#9E9E9E";
            }
        }
    }
}

function displayVacuum() {
    vacuums.forEach(function (vacuum) {
        var vacuumValue = 0;
        var vacuumTemp = 0;
        var deltaVacuum = 0;
        var vacuumCharge = 0;
        var vacuumIllum = 0;
        var vacuumDrop = 0;
        var valueElem;
        var valueElemId = "vacuum_" + vacuum.code + "_value";
        var vacuumElemId = "vacuum_" + vacuum.code;
        var deltaVacElemId = "vacuum_" + vacuum.code + "_deltaVac";
        var tempElemId = "vacuum_" + vacuum.code + "_temp";
        var chargeElemId = "vacuum_" + vacuum.code + "_percentCharge";
        var illumElemId = "vacuum_" + vacuum.code + "_lightIntensity";
        var rssiElemId = "vacuum_" + vacuum.code + "_rssi";
        var updatedElemId = "vacuum_" + vacuum.code + "_lastUpdate";
        if (document.getElementById(vacuumElemId) == null) {
            var vacuumElem = document.createElement("tr");
            vacuumElem.setAttribute("id", vacuumElemId);
            document.getElementById("vacuumlist").appendChild(vacuumElem);

            var codeElement = document.createElement("td");
            codeElement.innerHTML = vacuum.label;
            codeElement.setAttribute("class", "vacuumcode");
            vacuumElem.appendChild(codeElement);

            valueElem = document.createElement("td");
            valueElem.setAttribute("id", valueElemId);
            valueElem.setAttribute("class", "vacuumtemp");
            vacuumElem.appendChild(valueElem);

            // Perte de vide sur la ligne
            deltaVacElem = document.createElement("td");
            deltaVacElem.setAttribute("id", deltaVacElemId);
            deltaVacElem.setAttribute("class", "vacuumtemp");
            vacuumElem.appendChild(deltaVacElem);

            // if('temp' in vacuum){
            tempElem = document.createElement("td");
            tempElem.setAttribute("id", tempElemId);
            tempElem.setAttribute("class", "vacuumtemp");
            vacuumElem.appendChild(tempElem);
            // }
            // if('percentCharge' in vacuum){
            chargeElem = document.createElement("td");
            chargeElem.setAttribute("id", chargeElemId);
            chargeElem.setAttribute("class", "vacuumtemp");
            vacuumElem.appendChild(chargeElem);
            // }
            // if('lightIntensity' in vacuum){
            illumElem = document.createElement("td");
            illumElem.setAttribute("id", illumElemId);
            illumElem.setAttribute("class", "vacuumtemp");
            vacuumElem.appendChild(illumElem);
            // }
            // if('rssi' in vacuum){
            rssiElem = document.createElement("td");
            rssiElem.setAttribute("id", rssiElemId);
            rssiElem.setAttribute("class", "vacuumtemp");
            vacuumElem.appendChild(rssiElem);
            // }
            // if('lastUpdate' in vacuum){
            updatedElem = document.createElement("td");
            updatedElem.setAttribute("id", updatedElemId);
            updatedElem.setAttribute("class", "vacuumtemp");
            updatedElem.style.visibility = "collapse";
            vacuumElem.appendChild(updatedElem);
            // }
        } else {
            valueElem = document.getElementById(valueElemId);
            if ("temp" in vacuum) {
                tempElem = document.getElementById(tempElemId);
            }
            if ("ref" in vacuum) {
                deltaVacElem = document.getElementById(deltaVacElemId);
            }
            if ("percentCharge" in vacuum) {
                chargeElem = document.getElementById(chargeElemId);
            }
            if ("lightIntensity" in vacuum) {
                illumElem = document.getElementById(illumElemId);
            }
            if ("rssi" in vacuum) {
                rssiElem = document.getElementById(rssiElemId);
            }
            if ("lastUpdate" in vacuum) {
                updatedElem = document.getElementById(updatedElemId);
            }
        }
        vacuumValue = (vacuum.rawValue + vacuum.offset) / 100;
        valueElem.innerHTML = vacuumValue.toFixed(1);
        valueElem.style.textAlign = "right";
        // Sauve les valeurs de références pour le calcul des perte de vide
        if (
            vacuum.code == "V1" ||
            vacuum.code == "V2" ||
            vacuum.code == "V3" ||
            vacuum.code == "PV1" ||
            vacuum.code == "PV2" ||
            vacuum.code == "PV3"
        ) {
            valueRef[vacuum.ref] = vacuumValue;
        }

        vacuumDrop = vacuumValue - valueRef[vacuum.ref];
        deltaVacElem.innerHTML = vacuumDrop.toFixed(1);
        deltaVacElem.style.textAlign = "right";
        deltaVacElem.style.backgroundColor = setVacuumDropColor(vacuumDrop);

        if ("temp" in vacuum) {
            var vacuumTemp = vacuum.temp;
            tempElem.innerHTML = vacuumTemp.toFixed(1);
            tempElem.style.textAlign = "right";
        }
        if ("percentCharge" in vacuum) {
            var chargeTemp = vacuum.percentCharge;
            chargeElem.innerHTML = chargeTemp.toFixed(0);
            chargeElem.style.textAlign = "right";
            chargeElem.style.backgroundColor = setBatteryColorLineVacuum(
                vacuum.percentCharge
            );
        }
        if ("lightIntensity" in vacuum) {
            var illumTemp = vacuum.lightIntensity;
            illumElem.innerHTML = illumTemp.toFixed(0);
            illumElem.style.textAlign = "right";
        }
        if ("rssi" in vacuum) {
            var signalTemp = "" + vacuum.rssi + ", ?";
            if ("signalQual" in vacuum) {
                signalTemp = "" + vacuum.rssi + ", " + vacuum.signalQual;
            }
            rssiElem.innerHTML = signalTemp;
            rssiElem.style.textAlign = "right";
        }
        if ("lastUpdate" in vacuum) {
            var ageInMinutes = Math.floor(
                getMinutesAgo(new Date(vacuum.device.lastUpdatedAt))
            );
            // console.log("ageInMinutes= ", ageInMinutes);
            updatedTemp = ageInMinutes;
            updatedElem.innerHTML = updatedTemp.toFixed(0);
            updatedElem.style.textAlign = "right";
        }
        var vacuumElem = document.getElementById("vacuum_" + vacuum.code);
        setAgeColor(vacuumElem, vacuum.device);
        updatedElem = document.getElementById(updatedElemId);
        setAgeLineVacuum(updatedElem, vacuum.device);
    });
}

function displayTemperatures() {
    devices.forEach(function (device) {
        var ambientTempElemId = "device_" + device.name + "_ambientTemp";
        var enclosureTempElemId = "device_" + device.name + "_enclosureTemp";
        var sensorUS100TempElemId = "device_" + device.name + "_sensorTemp";
        var lastUpdatedAtElem;
        var deviceElemId = "device_" + device.name;
        if (document.getElementById(deviceElemId) == null) {
            var deviceElem = document.createElement("tr");
            deviceElem.setAttribute("id", deviceElemId);
            document.getElementById("temperaturelist").appendChild(deviceElem);

            var nameElement = document.createElement("td");
            nameElement.innerHTML = device.name;
            deviceElem.appendChild(nameElement);

            ambientTempElem = document.createElement("td");
            ambientTempElem.setAttribute("id", ambientTempElemId);
            deviceElem.appendChild(ambientTempElem);

            enclosureTempElem = document.createElement("td");
            enclosureTempElem.setAttribute("id", enclosureTempElemId);
            deviceElem.appendChild(enclosureTempElem);

            sensorUS100TempElem = document.createElement("td");
            sensorUS100TempElem.setAttribute("id", sensorUS100TempElemId);
            deviceElem.appendChild(sensorUS100TempElem);
        } else {
            ambientTempElem = document.getElementById(ambientTempElemId);
            enclosureTempElem = document.getElementById(enclosureTempElemId);
            sensorUS100TempElem = document.getElementById(
                sensorUS100TempElemId
            );
        }

        ambientTempElem.innerHTML = device.ambientTempElemId;
        enclosureTempElem.innerHTML = device.enclosureTempElemId;
        sensorUS100TempElem.innerHTML = device.sensorTemp;
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
    } else if (IndicatorValue == "OFF" || IndicatorValue == 0) {
        IndicatorElem.style.backgroundColor = "#ff3f3f"; // Rouge
    } else if (IndicatorValue == "ON" || IndicatorValue == 1) {
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
    try {
        var lastUpdatedAtElemId = "device_" + deviceDevice + "_lastUpdatedAt";
        if (
            typeof lastUpdatedAtElemId !== undefined ||
            typeof lastUpdatedAtElemId !== null
        ) {
            var lastUpdatedAtElem =
                document.getElementById(lastUpdatedAtElemId);
            if (
                typeof displayElem !== undefined ||
                typeof displayElem !== null
            ) {
                displayElem.style.color = lastUpdatedAtElem.style.color;
            }
        }
    } catch (err) {
        console.log("lastUpdatedAtElemId: " + lastUpdatedAtElemId + " " + err);
    }
}

function setAgeLineVacuum(displayElem, deviceDevice) {
    try {
        var lastUpdatedAtElemId = "device_" + deviceDevice + "_lastUpdatedAt";
        if (
            typeof lastUpdatedAtElemId !== undefined ||
            typeof lastUpdatedAtElemId !== null
        ) {
            var lastUpdatedAtElem =
                document.getElementById(lastUpdatedAtElemId);
            if (
                typeof displayElem !== undefined ||
                typeof displayElem !== null
            ) {
                displayElem.innerHTML = lastUpdatedAtElem.innerHTML;
            }
        }
    } catch (err) {
        console.log("lastUpdatedAtElemId: " + lastUpdatedAtElemId + " " + err);
    }
}

function setBatteryColorLineVacuum(percentCharge) {
    try {
        if (percentCharge >= 60) {
            return "#e6e6e6"; // Light gray - Normal. 70% et plus
        } else if (percentCharge >= 40) {
            return "Orange"; // Orange - Faible. Entre 50% et 69%
        } else {
            return "Red"; // Red - Critique. Moins de 50%
        }
    } catch (err) {
        console.log("Erreur: " + err);
    }
}
function setVacuumDropColor(vacuumDrop) {
    const yellowLimit = 2.0;
    const redLimit = 3.0;
    try {
        if (vacuumDrop < yellowLimit) {
            return "#e6e6e6"; //Gris
        } else if (vacuumDrop < redLimit) {
            return "yellow";
        } else {
            return "red";
        }
    } catch (err) {
        console.log("Erreur: " + err);
    }
}

function toggleTablesVisibility(thisTable) {
    var btnElem = document.getElementById(thisTable + "TblBtn");
    var TableElem = document.getElementById(thisTable);
    if (TableElem.style.visibility == "hidden") {
        TableElem.style.visibility = "visible";
        btnElem.innerHTML = "Cacher les " + thisTable;
    } else if (TableElem.style.visibility == "visible") {
        btnElem.innerHTML = "Voir les " + thisTable;
        TableElem.style.visibility = "hidden";
    }
}

// Toggle status color
function toggleStatusColor() {
    var statusElem = document.getElementById("lastestUpdate");
    statusElem.style.backgroundColor =
        statusElem.style.backgroundColor == "" ? "#4CAF50" : "";
    setTimeout(function () {
        statusElem.style.backgroundColor =
            statusElem.style.backgroundColor == "" ? "#4CAF50" : "";
    }, 500);
}

function openSocket() {
    websocket = new WebSocket(wsUri(""), "dashboard-stream");
    websocket.onopen = function (evt) {
        console.log("Socket opened.");
    };
    websocket.onclose = function (evt) {
        console.log("Socket closed.");
        setTimeout(function () {
            openSocket();
        }, 5000);
    };
    websocket.onmessage = function (msg) {
        var data = JSON.parse(msg.data);
        tankDefs.forEach(function (tankDef, index) {
            var tank = data.tanks
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
            // console.log("Tank %s at %d: %s, raw= %s", tankDef.code, index, tankDef.contents, tankDef.rawValue);

            devices = data.devices;
            valves = data.valves;
            vacuums = data.vacuum;
            pumps = data.pumps;
            osmose = data.osmose;
            // temperatures = data.temperatures;
        });
        displayDevices();
        displayValves();
        displayTanks();
        displayPumps();
        displayVacuum();
        displayOsmose();
        // displayTemperatures();
        toggleStatusColor();
    };
    websocket.onerror = function (evt) {
        console.error("Error:" + evt);
    };
}

var sec = 0;
var couleTimer;

function pad(val) {
    return val > 9 ? val : "0" + val;
}

function startCouleeCounter(date) {
    couleTimer = setInterval(function () {
        sec = parseInt(Math.abs(Date.now() / 1e3 - new Date(date).getTime()));
        var timeStr = "</br> Durée: " + parseInt(sec / 86400, 10);
        timeStr = timeStr + "j " + pad(parseInt(sec / 3600, 10) % 24);
        timeStr = timeStr + "h " + pad(parseInt(sec / 60, 10) % 60);
        timeStr = timeStr + "m " + pad(sec % 60) + "s";
        document.getElementById("compteurDeTemps").innerHTML = timeStr;
    }, 1000);
    // console.log("Affichage début de coulée");
}

function stopCouleeCounter() {
    clearInterval(couleTimer);
    document.getElementById("compteurDeTemps").innerHTML = "";
    // console.log("Affichage fin de coulée");
}

setTimeout(function () {
    window.location.reload(1);
}, 3600000);

window.addEventListener("load", onLoad, false);
