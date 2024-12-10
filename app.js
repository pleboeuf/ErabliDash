#!/usr/bin/env node

const WebSocketClient = require("websocket").client;
const config = require("./config.json");
const dashboard = require("./dashboard.js").Dashboard(config, WebSocketClient);
const express = require("express");
const path = require("path");
const http = require("http");
const WebSocketServer = require("websocket").server;

const app = express();
const port = config.port || "3300";
const server = http.createServer(app);
const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false,
});
const connectedClients = [];

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
