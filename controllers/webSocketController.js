const wss = require('../config/webSocket');  // Đảm bảo bạn chỉ import WebSocket Server
const client = require('../config/mqtt');    // Import MQTT client đã được khởi tạo trong mqtt.js
const { addData, listenToSensorData, getDataFromSensorData } = require('../models/firebase');
const { handleWaterVolumeToday } = require('../models/ETO_Calculator');

let lastTimestamp = 0;

client.on('message', async function (topic, message) {
    let data = message.toString();
    let split = data.trim().split("|");
    let time = split[1];
    let temp = split[2];
    let humidity = split[3];
    let humidityInSideHouse = split[4];
    const date = new Date(parseInt(time, 10) * 1000).toString();
    const millisecond = time * 1000;

    console.log(topic);


    const today = date.substring(16, date.lastIndexOf("GMT"));
    // console.log(temp, humidity, humidityInSideHouse);

    if (time === lastTimestamp) {
        return;
    }

    lastTimestamp = time;
    console.log(`Dữ liệu mới cua topic ${topic}: ${temp}, ${humidity}, ${humidityInSideHouse}`);

    // add data to firebase
    await addData(topic, today, millisecond, temp, humidity, humidityInSideHouse);
    await handleWaterVolumeToday(topic);
    listenToSensorData(sendDataToClient);
});

//Send data to frontend
function sendDataToClient(data) {
    console.log('Sending data to WebSocket clients');

    wss.clients.forEach((wsClient) => {
        if (wsClient.readyState === wsClient.OPEN) {
            wsClient.send(JSON.stringify(data));
        }
    });
}
