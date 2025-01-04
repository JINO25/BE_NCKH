const firebaseStore = require('../models/firebase');
const weather = require('../config/config_weather');
const catchAsync = require('../middlewares/catchAsync');
const { calculateWaterVolumes, handleWaterVolumeToday, handleWaterVolumeTodayForKcSelected, calculateCurrentWaterVolume } = require('../models/ETO_Calculator');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const apiKey = process.env.apiKeyWeather;

exports.callApiWeather = async (req, res) => {
    const currentTime = new Date().toLocaleDateString();
    let { nameGarden } = req.body;
    let topic;
    const user = req.user;
    let lat, lon;

    if (nameGarden == null || nameGarden == undefined) {
        const data = await firebaseStore.getAllGardens(user);

        nameGarden = data[0].nameGarden;
        topic = data[0].topic;

        lat = data[0].latitude;
        lon = data[0].longitude;
    } else {
        const data = await firebaseStore.getAllGardenByName(user, nameGarden);

        topic = data[0].topic;
        lat = data[0].latitude;
        lon = data[0].longitude;
    }



    const rs = await checkWeather7days(currentTime, topic);
    console.log(rs);


    if (rs == false) {
        await fetch(`https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&key=${apiKey}`)
            .then(res => res.json())
            .then(data => {
                predictWeather7days(data, topic);
            })
    }

    await fetch(`https://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lon}&key=${apiKey}`)
        .then(res => res.json())
        .then(data => {
            dataWeatherCurrent(data, topic);
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
let highTemp;
let lowTemp;

async function checkWeather7days(time, topic) {
    const data = await firebaseStore.getWeather7days(topic);
    if (data == null) return false;

    if (data.timestamp == time) {
        highTemp = data.maxTemp[0];
        lowTemp = data.minTemp[0];
        return true;
    } else {
        return false;
    }

}

function dataWeatherCurrent(data, topic) {
    const icon = data.data[0].weather.icon
    const weatherTitle = data.data[0].weather.description;

    const solarRad = data.data[0].ghi;
    console.log(solarRad);

    const temp = data.data[0].temp;
    const humidity = data.data[0].rh;

    firebaseStore.addDataForWeatherToday(highTemp, lowTemp, temp, icon, humidity, solarRad, weatherTitle, topic);
}

function predictWeather7days(data, topic) {
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
    firebaseStore.addDataForWeather7days(highTemp7Days, lowTemp7Days, iconWeather, temp, datetime, topic);
}

exports.getHome = catchAsync(async (req, res) => {
    const user = req.user;
    let topic;
    let gardens;
    if (user) {
        const data = await firebaseStore.getAllGardens(user);
        gardens = data;
        console.log(gardens);


        if (data == null || !data || data.length == 0) {
            return res.status(200).json({
                user: res.locals.user,
                data: null
            });
        } else {
            topic = data[0].topic
            console.log(topic);
        }

    } else {
        return res.status(200).json({
            message: 'Vui lòng đăng nhập'
        })
    }

    const dataWeatherToday = await firebaseStore.getWeatherToday(topic);
    const dataWeather7days = await firebaseStore.getWeather7days(topic);
    const dataFromWaterVolume = await firebaseStore.getDataFromWaterVolume();

    let ETcOfWater = [];
    let waterVolume = [];
    let area;

    // nếu có yêu cầu tính với diện tích và kc chỉ định
    if (req.query.kc || req.query.name) {
        const kc = req.query.kc;
        const name = req.query.name;
        // const area = 400;

        switch (parseFloat(kc)) {
            case 0:
                ETcOfWater = dataFromWaterVolume.map(doc => doc.waterVolume.kc_085);
                break;
            case 0.5:
                ETcOfWater = dataFromWaterVolume.map(doc => doc.waterVolume.kc_05);
                break;
            case 0.85:
                ETcOfWater = dataFromWaterVolume.map(doc => doc.waterVolume.kc_085);
                break;
            case 0.6:
                ETcOfWater = dataFromWaterVolume.map(doc => doc.waterVolume.kc_06);
                break;
            default:
                ETcOfWater = dataFromWaterVolume.map(doc => doc.waterVolume.kc_085);
                break;
        }

        //tính với diện tích và kc chỉ định
        if (name != null && name != '' && name != ' ') {
            const garden = await firebaseStore.getAllGardenByName(user, name);

            area = garden[0].area;
            let topic = garden[0].topic;

            const predictWaterVolume = await calculateWaterVolumes(area, kc, topic);

            let humd = dataFromWaterVolume.map(doc => doc.humd);
            let millisecond = dataFromWaterVolume.map(doc => doc.millisecond);

            ETcOfWater.forEach((el) => {
                waterVolume.push(calculateCurrentWaterVolume(el, area));
            })

            return res.status(200).json({
                data: {
                    dataWeather7days,
                    predictWaterVolume,
                    dataFromWaterVolume: {
                        waterVolume,
                        humd,
                        millisecond
                    }
                }
            });
        }

        //không có diện tích thì mặc định sẽ tính với diện tích mặc định của vườn đầu tiên user tạo
        const garden = await firebaseStore.getAllGardens(user);

        area = garden[0].area;
        let topic = garden[0].topic;


        const predictWaterVolume = await calculateWaterVolumes(area, kc, topic);

        let humd = dataFromWaterVolume.map(doc => doc.humd);
        let millisecond = dataFromWaterVolume.map(doc => doc.millisecond);


        ETcOfWater.forEach((el) => {
            waterVolume.push(calculateCurrentWaterVolume(el, area));
        })

        return res.status(200).json({
            data: {
                dataWeather7days,
                predictWaterVolume,
                dataFromWaterVolume: {
                    waterVolume,
                    humd,
                    millisecond
                }
            }
        });
    }

    //mặc định tính với diện tích của vườn đầu tiên và kc 0.85 nếu người dùng không yêu cầu
    // const garden = await firebaseStore.getAllGardens(user);

    area = gardens[0].area;
    topic = gardens[0].topic;

    const predictWaterVolume = await calculateWaterVolumes(area, 0, topic);

    console.log('area ', area);


    let humd = dataFromWaterVolume.map(doc => doc.humd);
    let millisecond = dataFromWaterVolume.map(doc => doc.millisecond);

    ETcOfWater = dataFromWaterVolume.map(doc => doc.waterVolume.kc_085);

    ETcOfWater.forEach((el) => {
        waterVolume.push(calculateCurrentWaterVolume(el, area));
    })

    return res.status(200).json({
        status: 'success',
        user: res.locals.user,
        data: {
            gardens,
            dataWeatherToday,
            dataWeather7days,
            predictWaterVolume,
            dataFromWaterVolume: {
                waterVolume,
                humd,
                millisecond
            }
        }
    });
});

exports.getDataForChar = catchAsync(async (req, res) => {
    const kc = req.query.kc;
    const predictWaterVolume = await calculateWaterVolumes(500, kc);
    const dataFromWaterVolume = await firebaseStore.getDataFromWaterVolume();

    res.status(200).json({
        data: {
            predictWaterVolume,
            dataFromWaterVolume
        }
    });

})

exports.addDataWeatherToday = catchAsync(async (req, res) => {
    const { highTemp, lowTemp, temp, icon, humidity, solarRad, weatherTitle } = req.body;
    await firebaseStore.addDataForWeatherToday(highTemp, lowTemp, temp, icon, humidity, solarRad, weatherTitle);

    res.status(201).json({
        status: "success"
    })
});

exports.addDataForWeather7days = catchAsync(async (req, res) => {
    const { highTemp7Days, lowTemp7Days, iconWeather, temp, datetime } = req.body;
    await firebaseStore.addDataForWeather7days(highTemp7Days, lowTemp7Days, iconWeather, temp, datetime);

    res.status(201).json({
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

exports.addGardenInfo = catchAsync(async (req, res) => {
    const { nameGarden, typeGarden, method, area, note, latitude, longitude, topic } = req.body;
    const user = req.user;

    if (!user) {
        return res.status(401).json({
            status: 'fail',
            message: "Vui lòng đăng nhập"
        });
    }

    if (!nameGarden || !typeGarden || !method || !area || !latitude || !longitude || !topic) {
        return res.status(400).json({
            status: 'fail',
            message: "Vui lòng nhập đủ thông tin"
        });
    }

    await firebaseStore.addGarden(user, nameGarden, typeGarden, method, area, note, latitude, longitude, topic);

    return res.status(201).json({
        status: 'success'
    })

});

exports.getAllGardenInfo = catchAsync(async (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({
            status: 'fail',
            message: "Vui lòng đăng nhập"
        });
    }

    const data = await firebaseStore.getAllGardens(user);

    return res.status(200).json({
        status: 'success',
        data
    })

})

exports.getAllGardenInfoByName = catchAsync(async (req, res) => {
    const user = req.user;
    const { name } = req.params;
    if (!user) {
        return res.status(401).json({
            status: 'fail',
            message: "Vui lòng đăng nhập"
        });
    }

    if (!name)
        return res.status(400).json({
            status: 'fail',
            message: "Vui lòng nhập tên"
        });

    const data = await firebaseStore.getAllGardenByName(user, name);

    return res.status(200).json({
        status: 'success',
        data
    })

})

exports.updateGardenInfo = catchAsync(async (req, res) => {
    const { nameGarden, typeGarden, method, area, note, latitude, longitude, topic } = req.body;
    const user = req.user;

    const { name } = req.params;

    if (!user) {
        return res.status(401).json({
            status: 'fail',
            message: "Vui lòng đăng nhập"
        });
    }

    const updates = {
        "nameGarden": nameGarden,
        "typeGarden": typeGarden,
        "method": method,
        "area": area,
        "note": note,
        "latitude": latitude,
        "longitude": longitude,
        "topic": topic
    }

    const rs = await firebaseStore.updateGarden(user, name, updates);

    if (rs) {
        return res.status(201).json({
            status: 'success'
        })
    } else {
        return res.status(400).json({
            status: 'fail'
        })
    }
});

exports.deleteGardenInfo = catchAsync(async (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({
            status: 'fail',
            message: "Vui lòng đăng nhập"
        });
    }

    const { nameGarden } = req.body;

    if (!nameGarden)
        return res.status(400).json({
            status: 'fail',
            message: 'Vui lòng cung cấp tên vườn'
        })

    const rs = await firebaseStore.deleteGarden(user, nameGarden);

    if (rs) {
        return res.status(200).json({
            status: 'success'
        })
    } else {
        return res.status(400).json({
            status: 'fail'
        })
    }
})