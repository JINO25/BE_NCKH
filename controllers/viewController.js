const firebaseStore = require('../models/firebase');
const weather = require('../config/config_weather');
const catchAsync = require('../middlewares/catchAsync');

exports.callApiWeather = async (req, res) => {
    await fetch(weather.url7days)
        .then(res => res.json())
        .then(data => {
            predictWeather7days(data)
        })

    fetch(weather.urlToday)
        .then(res => res.json())
        .then(data => {
            dataWeatherCurrent(data)
        })

    res.status(200).json({
        status: 'success'
    })
}

let highTemp7Days = [];
let lowTemp7Days = [];
let iconWeather = [];
let temp = [];
let datetime = [];

function dataWeatherCurrent(data) {
    const icon = data.data[0].weather.icon
    const weatherTitle = data.data[0].weather.description;

    const solarRad = data.data[0].solar_rad;
    console.log(solarRad);

    const temp = data.data[0].temp;
    const humidity = data.data[0].rh;

    firebaseStore.addDataForWeatherToday(highTemp, lowTemp, temp, icon, humidity, solarRad, weatherTitle);
}

function predictWeather7days(data) {

    highTemp = data.data[0].app_max_temp;
    lowTemp = data.data[0].app_min_temp;

    for (let i = 0; i < 7; i++) {
        const date = data.data[i].datetime;
        // const day = new Date(date).getDay();
        datetime.push(date);

        highTemp7Days.push(data.data[i].app_max_temp);
        lowTemp7Days.push(data.data[i].app_min_temp);

        const icon = data.data[i].weather.icon;
        iconWeather.push(icon);

        const t = data.data[i].temp;
        temp.push(t);
    }
    firebaseStore.addDataForWeather7days(highTemp7Days, lowTemp7Days, iconWeather, temp, datetime);
}

exports.getHome = catchAsync(async (req, res) => {
    const dataWeatherToday = await firebaseStore.getWeatherToday();
    const dataWeather7days = await firebaseStore.getWeather7days();

    // console.log('user ', req.user);

    res.status(200).json({
        status: 'success',
        user: res.locals.user,
        data: {
            dataWeatherToday,
            dataWeather7days
        }
    });
});

exports.addDataWeatherToday = catchAsync(async (req, res) => {
    const { highTemp, lowTemp, temp, icon, humidity, solarRad, weatherTitle } = req.body;
    await firebaseStore.addDataForWeatherToday(highTemp, lowTemp, temp, icon, humidity, solarRad, weatherTitle);

    res.status(200).json({
        status: "success"
    })
});

exports.addDataForWeather7days = catchAsync(async (req, res) => {
    const { highTemp7Days, lowTemp7Days, iconWeather, temp, datetime } = req.body;
    await firebaseStore.addDataForWeather7days(highTemp7Days, lowTemp7Days, iconWeather, temp, datetime);

    res.status(200).json({
        status: "success"
    })
});

exports.getDataWeatherToday = catchAsync(async (req, res) => {
    const data = await firebaseStore.getWeatherToday();

    res.status(200).json({
        status: 'success',
        data
    });
});

exports.getDataWeather7Days = catchAsync(async (req, res) => {
    const data = await firebaseStore.getWeather7days();

    res.status(200).json({
        status: 'success',
        data
    });
});