const mqtt = require('mqtt');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const options = {
    clientId: process.env.clientId,
    username: process.env.usernameMQTT,
    password: process.env.passwordMQTT,
    clean: true
}

const client = mqtt.connect(process.env.brokenURL, options);
const topic = process.env.topic;

client.on('connect', function () {
    // Subscribe to a topic
    client.subscribe(topic, function (err) {
        if (err) {
            // Publish a message to a topic
            console.log(err);

        }
    })
});


module.exports = client;