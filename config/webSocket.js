const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8087 });

wss.on('connection', (ws) => {
    console.log('WebSocket connected');

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});


module.exports = wss;