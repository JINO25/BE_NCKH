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

    // const date = new Date(parseInt(time, 10) * 1000).toString();
    const date = new Date(parseInt(time, 10) * 1000);

    const millisecond = time * 1000;

    const options = {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
        hourCycle: 'h23'
    };
    const VN = new Intl.DateTimeFormat('en-US', options).format(date);


    const today = VN.substring(16, VN.lastIndexOf("GMT"));
    // const today = VN.substring(VN.lastIndexOf(","), VN.lastIndexOf("GMT"));

    if (time === lastTimestamp) {
        return;
    }

    // getDataFromSensorData(sendDataToClient);

    lastTimestamp = time;
    console.log(`Dữ liệu mới: ${temp}, ${humidity}, ${humidityInSideHouse}`);

    // add data to firebase
    await addData(today, millisecond, temp, humidity, humidityInSideHouse);
    await handleWaterVolumeToday();
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
