const firebaseStore = require("../models/firebase");
const weather = require("../config/config_weather");

let highTemp;
let lowTemp;

async function checkWeather7days(time) {
  const data = await firebaseStore.getWeather7days();
  if (data == null) return false;

  if (data.timestamp == time) {
    highTemp = data.maxTemp[0];
    lowTemp = data.minTemp[0];
    return true;
  } else {
    return false;
  }
}

function dataWeatherCurrent(data) {
  const icon = data.data[0].weather.icon;
  const weatherTitle = data.data[0].weather.description;
  const solarRad = data.data[0].ghi;
  console.log(`Solar Rad: ${solarRad}`);
  const temp = data.data[0].temp;
  const humidity = data.data[0].rh;
  firebaseStore.addDataForWeatherToday(
    highTemp,
    lowTemp,
    temp,
    icon,
    humidity,
    solarRad,
    weatherTitle
  );
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
  firebaseStore.addDataForWeather7days(
    highTemp7Days,
    lowTemp7Days,
    iconWeather,
    temp,
    datetime
  );
}

exports.fetchAndSaveWeather=async()=> {
  const currentTime = new Date().toLocaleDateString();

  const rs = await checkWeather7days(currentTime);

  if (rs == false) {
    const data7days = await fetch(weather.url7days).then((res) => res.json());
    await predictWeather7days(data7days);
  }

  const dataToday = await fetch(weather.urlToday).then((res) => res.json());
  await dataWeatherCurrent(dataToday);

}