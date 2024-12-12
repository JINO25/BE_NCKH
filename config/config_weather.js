// const apiKey = "c76c27beb2f949449b36fcc83a532629";
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const apiKey = process.env.apiKeyWeather;
const url7days = `https://api.weatherbit.io/v2.0/forecast/daily?city_id=Can%20Tho&city=Can%20Tho&postal_code=%2B84&country=Vi%E1%BB%87t%20Nam&key=${apiKey}`

const urlToday = `https://api.weatherbit.io/v2.0/current?city_id=Can%20Tho&city=Can%20Tho&postal_code=%2B84&country=Vi%E1%BB%87t%20Nam&key=${apiKey}`

module.exports = { urlToday, url7days };