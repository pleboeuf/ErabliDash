#!/usr/bin/env node
require("dotenv").config();
const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
const WebSocketClient = require("websocket").client;
const config = require("./config.json");
const exportConfig = require("../ErabliExport/config.json");
const dashboard = require("./dashboard.js").Dashboard(config, WebSocketClient);
const express = require("express");
const path = require("path");
const http = require("http");
const WebSocketServer = require("websocket").server;
// const fetch = require("node-fetch"); // Import node-fetch
const cors = require("cors"); // Import cors
const Influx = require("influx");

const app = express();
const port = config.port || "3300";
const server = http.createServer(app);
const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false,
});
const connectedClients = [];

// Add this line to enable cors
app.use(cors());

dashboard
    .init()
    .then(() => dashboard.connect(() => dashboard.update()))
    .then(() => {
        dashboard.onQueryComplete(() => dashboard.subscribe());
        return dashboard.start();
    })
    .catch((err) => {
        console.error("Error starting dashboard: ", err.stack);
    });

app.use(express.static(path.join(__dirname, "public")));
app.use(
    "/bower_components",
    express.static(path.join(__dirname, "bower_components"))
);
app.use("/", express.static(path.join(__dirname, "index.html")));

app.get("/data.json", (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send(JSON.stringify(dashboard.getData(), null, 2));
    // console.log(dashboard.getData().osmose);
});

// Add the proxy route
app.get("/api/vacuum", async (req, res) => {
    try {
        const externalResponse = await fetch(process.env.ENDPOINT_VAC); // Use process.env.ENDPOINT_VAC
        if (!externalResponse.ok) {
            throw new Error(`HTTP error! status: ${externalResponse.status}`);
        }
        const data = await externalResponse.json();
        res.json(data);
    } catch (error) {
        console.error("Error fetching from external API:", error);
        res.status(500).send("Error fetching data");
    }
});

// InfluxDB client for SaisonInfo
function getInfluxClient(database) {
    return new Influx.InfluxDB({
        host: exportConfig.influxdb.host,
        port: exportConfig.influxdb.port,
        database: database,
    });
}

// Parse JSON body
app.use(express.json());

// Get SaisonInfo data
app.get("/api/saison-info", async (req, res) => {
    try {
        const database = exportConfig.influxdb.database;
        const influx = getInfluxClient(database);
        
        // Check if database exists
        const databases = await influx.getDatabaseNames();
        if (!databases.includes(database)) {
            return res.json({ exists: false, data: {} });
        }
        
        // Query SaisonInfo measurement - get all entries to merge startTime and endTime
        // Since they are written as separate points, we need to get all and merge
        const query = `SELECT * FROM SaisonInfo`;
        const results = await influx.query(query);
        
        const data = {};
        results.forEach((row) => {
            const pompe = row.pompe;
            if (pompe) {
                if (!data[pompe]) {
                    data[pompe] = { startTime: null, endTime: null };
                }
                // Merge values - keep the latest non-null value for each field
                if (row.startTime) data[pompe].startTime = row.startTime;
                if (row.endTime) data[pompe].endTime = row.endTime;
            }
        });
        
        res.json({ exists: true, data });
    } catch (error) {
        console.error("Error reading SaisonInfo:", error);
        // If measurement doesn't exist, return empty
        if (error.message && error.message.includes("measurement not found")) {
            return res.json({ exists: false, data: {} });
        }
        res.status(500).json({ error: "Error reading SaisonInfo" });
    }
});

// Write SaisonInfo data
app.post("/api/saison-info", async (req, res) => {
    try {
        const { pompe, field, value } = req.body;
        
        if (!pompe || !field || !value) {
            return res.status(400).json({ error: "Missing required fields: pompe, field, value" });
        }
        
        if (!['startTime', 'endTime'].includes(field)) {
            return res.status(400).json({ error: "Field must be 'startTime' or 'endTime'" });
        }
        
        const database = exportConfig.influxdb.database;
        const influx = getInfluxClient(database);
        
        // Check if database exists
        const databases = await influx.getDatabaseNames();
        if (!databases.includes(database)) {
            return res.status(500).json({ error: `Database '${database}' does not exist` });
        }
        
        // Write the point with precision 'ms' for better timestamp handling
        await influx.writePoints([
            {
                measurement: 'SaisonInfo',
                tags: { pompe: pompe },
                fields: { [field]: value },
            }
        ], { precision: 'ms' });
        
        console.log(`SaisonInfo: ${field} saved for ${pompe} = ${value}`);
        res.json({ success: true, message: `${field} saved for ${pompe}` });
    } catch (error) {
        console.error("Error writing SaisonInfo:", error);
        res.status(500).json({ error: "Error writing SaisonInfo" });
    }
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

function publishData(connection) {
    connection.sendUTF(JSON.stringify(dashboard.getData()));
}

wsServer.on("request", (request) => {
    try {
        if (!originIsAllowed(request.origin)) {
            request.reject();
            console.log(
                `${new Date()} Connection from origin ${
                    request.origin
                } rejected.`
            );
            return;
        }
        const connection = request.accept("dashboard-stream", request.origin);
        connectedClients.push(connection);
        console.log(
            `${new Date()} Connection accepted from ${
                connection.remoteAddress
            }. Connections: ${connectedClients.length}`
        );

        connection.on("message", (message) => {
            if (message.type === "utf8") {
                console.log("Dropping message: " + message.utf8Data);
            }
        });

        connection.on("close", (reasonCode, description) => {
            connectedClients.splice(connectedClients.indexOf(connection), 1);
            console.log(
                `${new Date()} Peer ${
                    connection.remoteAddress
                } disconnected. Connections: ${connectedClients.length}`
            );
        });

        publishData(connection);
    } catch (exception) {
        console.error("Error while handling request", exception);
    }
});

dashboard.onChange(() => {
    connectedClients.forEach((connection) => {
        publishData(connection);
    });
});

server.listen(port, () => {
    console.log(`HTTP Server started: http://localhost:${port}`);
});

// Graceful shutdown on SIGINT (Ctrl-C)
process.on("SIGINT", async () => {
    console.log("\nReceived SIGINT, shutting down gracefully...");

    // Close all WebSocket connections
    console.log("Closing WebSocket connections...");
    connectedClients.forEach((connection) => {
        try {
            connection.close();
        } catch (err) {
            console.error("Error closing connection:", err);
        }
    });

    // Stop the dashboard (saves data)
    console.log("Stopping dashboard...");
    try {
        await dashboard.stop();
    } catch (err) {
        console.error("Error stopping dashboard:", err);
    }

    // Close the HTTP server
    console.log("Closing HTTP server...");
    server.close(() => {
        console.log("Server closed. Exiting.");
        process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        console.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
    }, 10000);
});
