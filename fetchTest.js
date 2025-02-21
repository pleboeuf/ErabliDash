"use strict";

const vacEndpoint = "https://da1222.base.datacer.online/vacuum";
const tankEndpoint = "https://da1222.base.datacer.online/tank";
const waterEndpoint = "https://da1222.base.datacer.online/water";
const allEndpoint = "https://da1222.base.datacer.online/all";

async function getDatacerData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const data = await response.json();
        // console.log(data);
        return data;
    } catch (error) {
        console.error(error.message);
    }
}

var water = await getDatacerData(waterEndpoint);
console.log(water);
var vacuum = await getDatacerData(vacEndpoint);
console.log(vacuum);

////////////////////////////

// DatacerTank: Source
{
    tank: [
        {
            code: 6,
            name: "RC1",
            device: "BASSIN RC1-RC2-RF1",
            Depth: "43.00",
            SensorDistance: "0.00",
            ReadingValue: "0.79",
            rawValue: "0.79",
            lastUpdatedAt: "2024-12-15 13:57:59",
            Capacity: 800,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 2,
        },
        {
            code: 7,
            name: "RC2",
            device: "BASSIN RC1-RC2-RF1",
            Depth: "45.00",
            SensorDistance: "0.00",
            ReadingValue: "0.79",
            rawValue: "0.79",
            lastUpdatedAt: "2024-12-15 13:57:59",
            Capacity: 800,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 2,
        },
        {
            code: 8,
            name: "RF1",
            device: "BASSIN RC1-RC2-RF1",
            Depth: "85.00",
            SensorDistance: "0.00",
            ReadingValue: "1.43",
            rawValue: "1.43",
            lastUpdatedAt: "2024-12-15 13:57:59",
            Capacity: 2800,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 2,
        },
        {
            code: 11,
            name: "RF2",
            device: "BASSIN RF2-RS1-RS2",
            Depth: "80.00",
            SensorDistance: "0.00",
            ReadingValue: "0.00",
            rawValue: "0.00",
            lastUpdatedAt: "2024-12-15 13:58:32",
            Capacity: 2000,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 0,
        },
        {
            code: 12,
            name: "RS1",
            device: "BASSIN RF2-RS1-RS2",
            Depth: "80.00",
            SensorDistance: "0.00",
            ReadingValue: "0.12",
            rawValue: "0.12",
            lastUpdatedAt: "2024-12-15 13:58:32",
            Capacity: 5048,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 0,
        },
        {
            code: 13,
            name: "RS2",
            device: "BASSIN RF2-RS1-RS2",
            Depth: "80.00",
            SensorDistance: "0.00",
            ReadingValue: "0.00",
            rawValue: "0.00",
            lastUpdatedAt: "2024-12-15 13:58:32",
            Capacity: 4110,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 0,
        },
        {
            code: 21,
            name: "RS3",
            device: "BASSIN RS3-RS4",
            Depth: "95.00",
            SensorDistance: "0.00",
            ReadingValue: "0.70",
            rawValue: "0.70",
            lastUpdatedAt: "2024-12-15 13:58:29",
            Capacity: 4239,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 1,
        },
        {
            code: 22,
            name: "RS4",
            device: "BASSIN RS3-RS4",
            Depth: "95.00",
            SensorDistance: "0.00",
            ReadingValue: "0.00",
            rawValue: "0.00",
            lastUpdatedAt: "2024-12-15 13:58:29",
            Capacity: 3444,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 0,
        },
        {
            code: 16,
            name: "RS5",
            device: "BASSIN RS5-RS6",
            Depth: "46.00",
            SensorDistance: "0.00",
            ReadingValue: "0.34",
            rawValue: "0.34",
            lastUpdatedAt: "2024-04-13 12:18:44",
            Capacity: 919,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 1,
        },
        {
            code: 17,
            name: "RS6",
            device: "BASSIN RS5-RS6",
            Depth: "46.00",
            SensorDistance: "0.00",
            ReadingValue: "0.00",
            rawValue: "0.00",
            lastUpdatedAt: "2024-04-13 12:18:44",
            Capacity: 919,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 0,
        },
    ];
}

// Dashboard Tank: Destination
[
    {
        code: "RS1",
        name: "Réservoir de sève #1",
        device: "EB-RS1",
        shape: "cylinder",
        orientation: "horizontal",
        length: 10718,
        diameter: 1651,
        sensorHeight: 1743,
        output: "VaS1",
        drain: "VaDS1",
        ssrRelay: "VaES1",
        rawValue: 1753,
        lastUpdatedAt: "2024-03-22T21:38:50.319Z",
        capacity: 22945.513465085496,
        fill: 0,
        getCapacity: [Function(anonymous)],
        getFill: [Function(anonymous)],
    },
    {
        code: "RS2",
        name: "Réservoir de sève #2",
        device: "EB-RS2",
        shape: "cylinder",
        orientation: "horizontal",
        length: 7010,
        diameter: 1842,
        sensorHeight: 1863,
        output: "VaS2",
        drain: "VaDS2",
        ssrRelay: "VaES2",
        rawValue: 2056,
        lastUpdatedAt: "2024-03-22T21:43:28.433Z",
        capacity: 18680.442135456353,
        fill: 0,
        getCapacity: [Function(anonymous)],
        getFill: [Function(anonymous)],
    },
    {
        code: "RS3",
        name: "Réservoir de sève #3",
        device: "EB-RS3",
        shape: "cylinder",
        orientation: "horizontal",
        length: 4128,
        diameter: 2438,
        sensorHeight: 2216,
        output: "VaS3",
        drain: "VaDS3",
        ssrRelay: "VaES3",
        rawValue: 1692,
        lastUpdatedAt: "2024-03-22T21:41:07.435Z",
        capacity: 19270.677017107253,
        fill: 3040.793336357321,
        getCapacity: [Function(anonymous)],
        getFill: [Function(anonymous)],
    },
    {
        code: "RS4",
        name: "Réservoir de sève #4",
        device: "EB-RS4",
        shape: "cylinder",
        orientation: "horizontal",
        length: 3353,
        diameter: 2438,
        sensorHeight: 1973,
        output: "VaS4",
        drain: "VaDS4",
        ssrRelay: "VaAPH1",
        rawValue: 1747,
        lastUpdatedAt: "2024-03-22T21:43:26.875Z",
        capacity: 15652.756792238522,
        fill: 728.7685296482523,
        getCapacity: [Function(anonymous)],
        getFill: [Function(anonymous)],
    },
    {
        code: "RS5",
        name: "Réservoir de sève pump house #1",
        device: "EB-RS5",
        shape: "u",
        length: 3657,
        diameter: 1219,
        totalHeight: 1067,
        sensorHeight: 1140,
        output: "VaS5",
        drain: "VaDS5",
        ssrRelay: "none",
        rawValue: 904,
        lastUpdatedAt: "2024-03-22T21:43:29.258Z",
        capacity: 4173.470869652411,
        fill: 580.0199254627888,
        getCapacity: [Function(anonymous)],
        getFill: [Function(anonymous)],
    },
    {
        code: "RS6",
        name: "Réservoir de sève pump house #2",
        device: "EB-RS6",
        shape: "u",
        length: 3657,
        diameter: 1219,
        totalHeight: 1067,
        sensorHeight: 1150,
        output: "VaS6",
        drain: "VaDS6",
        ssrRelay: "none",
        rawValue: 1140,
        lastUpdatedAt: "2024-03-22T21:39:24.085Z",
        capacity: 4173.470869652411,
        fill: 5.370241847385364,
        getCapacity: [Function(anonymous)],
        getFill: [Function(anonymous)],
    },
    {
        code: "RF2",
        name: "Réservoir de filtrat #2",
        device: "EB-RF2",
        shape: "cylinder",
        orientation: "horizontal",
        length: 4267,
        diameter: 1842,
        sensorHeight: 1872,
        output: "VaF2",
        drain: "VaDF2",
        ssrRelay: "VaDPH1",
        rawValue: 1898,
        lastUpdatedAt: "2024-03-22T21:40:01.342Z",
        capacity: 11370.819770612306,
        fill: 0,
        getCapacity: [Function(anonymous)],
        getFill: [Function(anonymous)],
    },
    {
        code: "RF1",
        name: "Réservoir de filtrat #1",
        device: "EB-RF1",
        shape: "u",
        length: 4877,
        diameter: 1524,
        totalHeight: 1676,
        sensorHeight: 1700,
        output: "none",
        drain: "none",
        ssrRelay: "none",
        rawValue: 1720,
        lastUpdatedAt: "2024-12-15T17:02:56.922Z",
        capacity: 11241.531148005291,
        fill: 0,
        getCapacity: [Function(anonymous)],
        getFill: [Function(anonymous)],
    },
    {
        code: "RC1",
        name: "Réservoir de concentré #1",
        device: "EB-RC1",
        shape: "u",
        length: 3658,
        diameter: 1219,
        totalHeight: 914,
        sensorHeight: 986,
        output: "none",
        drain: "none",
        ssrRelay: "none",
        rawValue: 998,
        lastUpdatedAt: "2024-12-15T17:03:02.769Z",
        capacity: 3492.3694916725512,
        fill: 0,
        getCapacity: [Function(anonymous)],
        getFill: [Function(anonymous)],
    },
    {
        code: "RC2",
        name: "Réservoir de concentré #2",
        device: "EB-RC2",
        shape: "u",
        length: 3658,
        diameter: 1219,
        totalHeight: 914,
        sensorHeight: 968,
        output: "none",
        drain: "none",
        ssrRelay: "none",
        rawValue: 993,
        lastUpdatedAt: "2024-12-15T17:04:01.719Z",
        capacity: 3492.3694916725512,
        fill: 0,
        getCapacity: [Function(anonymous)],
        getFill: [Function(anonymous)],
    },
    {
        code: "RHC",
        name: "Réservoir huile a chauffage",
        device: "EB-RHC",
        shape: "cylinder",
        orientation: "horizontal",
        length: 3000,
        diameter: 1270,
        sensorHeight: 1270,
        output: "none",
        drain: "none",
        ssrRelay: "none",
        rawValue: 646,
        lastUpdatedAt: "2024-03-22T21:43:25.425Z",
        capacity: 3800.306093231233,
        fill: 1858.245142772967,
        getCapacity: [Function(anonymous)],
        getFill: [Function(anonymous)],
    },
];

// Chatgpt:

// Exemple de données de la source (json) et de la destination
const sourceData = {
    tank: [
        {
            code: 6,
            name: "RC1",
            device: "BASSIN RC1-RC2-RF1",
            Depth: "43.00",
            SensorDistance: "0.00",
            ReadingValue: "0.79",
            rawValue: "0.79",
            lastUpdatedAt: "2024-12-15 13:57:59",
            Capacity: 800,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 2,
        },
        {
            code: 7,
            name: "RC2",
            device: "BASSIN RC1-RC2-RF1",
            Depth: "45.00",
            SensorDistance: "0.00",
            ReadingValue: "0.79",
            rawValue: "0.79",
            lastUpdatedAt: "2024-12-15 13:57:59",
            Capacity: 800,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 2,
        },
        {
            code: 8,
            name: "RF1",
            device: "BASSIN RC1-RC2-RF1",
            Depth: "85.00",
            SensorDistance: "0.00",
            ReadingValue: "1.43",
            rawValue: "1.43",
            lastUpdatedAt: "2024-12-15 13:57:59",
            Capacity: 2800,
            IDTypePressure: 3,
            ID_IO_Type: 9,
            fill: 2,
        },
        // ... autres éléments de sourceData
    ],
};

const destinationData = [
    {
        code: "RS1",
        name: "Réservoir de sève #1",
        device: "EB-RS1",
        shape: "cylinder",
        orientation: "horizontal",
        length: 10718,
        diameter: 1651,
        sensorHeight: 1743,
        output: "VaS1",
        drain: "VaDS1",
        ssrRelay: "VaES1",
        rawValue: 1753,
        lastUpdatedAt: "2024-03-22T21:38:50.319Z",
        capacity: 22945.513465085496,
        fill: 0,
        getCapacity: function () {},
        getFill: function () {},
    },
    {
        code: "RS2",
        name: "Réservoir de sève #2",
        device: "EB-RS2",
        shape: "cylinder",
        orientation: "horizontal",
        length: 7010,
        diameter: 1842,
        sensorHeight: 1863,
        output: "VaS2",
        drain: "VaDS2",
        ssrRelay: "VaES2",
        rawValue: 2056,
        lastUpdatedAt: "2024-03-22T21:43:28.433Z",
        capacity: 18680.442135456353,
        fill: 0,
        getCapacity: function () {},
        getFill: function () {},
    },
    // ... autres éléments de destinationData
];

// Fonction pour mettre à jour les valeurs dans destinationData en fonction des données source
function updateData(source, destination) {
    source.tank.forEach((sourceItem) => {
        const matchingDest = destination.find(
            (destItem) => destItem.code === sourceItem.name
        ); // Trouve l'élément correspondant
        if (matchingDest) {
            // Mise à jour des valeurs rawValue et lastUpdatedAt
            matchingDest.rawValue = parseFloat(sourceItem.rawValue); // Conversion en nombre si nécessaire
            matchingDest.lastUpdatedAt = new Date(
                sourceItem.lastUpdatedAt
            ).toISOString(); // Conversion en format ISO
        }
    });
}

// Exécution de la fonction pour mettre à jour destinationData
updateData(sourceData, destinationData);

// Affichage du résultat pour vérification
console.log(destinationData);

//   Copilot:

const fetch = require("node-fetch");

const sourceUrl = "https://da1222.base.datacer.online/tank";

const destinationArray = [
    {
        code: "RS1",
        name: "Réservoir de sève #1",
        device: "EB-RS1",
        shape: "cylinder",
        orientation: "horizontal",
        length: 10718,
        diameter: 1651,
        sensorHeight: 1743,
        output: "VaS1",
        drain: "VaDS1",
        ssrRelay: "VaES1",
        rawValue: 1753,
        lastUpdatedAt: "2024-03-22T21:38:50.319Z",
        capacity: 22945.513465085496,
        fill: 0,
        getCapacity: function () {
            /* function implementation */
        },
        getFill: function () {
            /* function implementation */
        },
    },
    // ... other destination objects
];

async function fetchData() {
    try {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateDestinationArray(data.tank);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function updateDestinationArray(sourceArray) {
    sourceArray.forEach((sourceItem) => {
        const destinationItem = destinationArray.find(
            (dest) => dest.code === sourceItem.name
        );
        if (destinationItem) {
            destinationItem.rawValue = sourceItem.rawValue;
            destinationItem.lastUpdatedAt = sourceItem.lastUpdatedAt;
        }
    });
    console.log("Updated destination array:", destinationArray);
}

// Fetch data every minute (60000 milliseconds)
setInterval(fetchData, 60000);

// Initial fetch
fetchData();
