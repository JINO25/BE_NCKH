const wss = require('../config/webSocket');  // Đảm bảo bạn chỉ import WebSocket Server
const client = require('../config/mqtt');    // Import MQTT client đã được khởi tạo trong mqtt.js
const { addData, listenToSensorData, getDataFromSensorData } = require('../models/firebase');
const { handleWaterVolumeToday } = require('../models/ETO_Calculator');
const { DateTime } = require('luxon');

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
    const timestamp = DateTime.now().setZone('Asia/Ho_Chi_Minh');

    const startOfDay = timestamp.startOf('day').plus({ hours: 5, minutes: 30 }); // 5:00 AM
    const endOfDay = timestamp.startOf('day').plus({ hours: 16, minutes: 30 }); // 4:30 PM

    if (timestamp < startOfDay || timestamp > endOfDay) {
        console.log('Data is outside the time range (5:30 AM - 4:30 PM). Skipping.');
        return;
    }


    if (date < startOfDay || date > endOfDay) {
        console.log('Data is outside the time range (5:00 AM - 4:30 PM). Skipping.');
        return;
    }

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


    // const today = date.substring(16, date.lastIndexOf("GMT"));
    const today = VN.substring(VN.lastIndexOf(",") + 1, VN.lastIndexOf("GMT")).trim();
    // console.log(today);


    if (time === lastTimestamp) {
        return;
    }


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
