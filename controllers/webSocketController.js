const wss = require('../config/webSocket');  // Đảm bảo bạn chỉ import WebSocket Server
const client = require('../config/mqtt');    // Import MQTT client đã được khởi tạo trong mqtt.js
const { addData, listenToSensorData } = require('../models/firebase');

let lastTimestamp = 0;

client.on('message', async function (topic, message) {
    let data = message.toString();
    let split = data.trim().split("|");
    let time = split[1];
    let temp = split[2];
    let humidity = split[3];
    const date = new Date(parseInt(time, 10) * 1000).toString();

    const today = date.substring(16, date.lastIndexOf("GMT"));
    console.log(temp, humidity);

    if (time === lastTimestamp) {
        return;
    }

    lastTimestamp = time;
    console.log(`Dữ liệu mới: ${temp}, ${humidity}`);

    // add data to firebase
    await addData(today, temp, humidity);

    listenToSensorData(sendDataToClient);
});

function sendDataToClient(data) {
    console.log('Sending data to WebSocket clients');

    wss.clients.forEach((wsClient) => {
        if (wsClient.readyState === wsClient.OPEN) {
            wsClient.send(JSON.stringify(data));
        }
    });
}
