const firebaseStore = require('../models/firebase');
const weather = require('../config/config_weather');
const catchAsync = require('../middlewares/catchAsync');
const { calculateWaterVolumes, handleWaterVolumeToday, handleWaterVolumeTodayForKcSelected, calculateCurrentWaterVolume } = require('../models/ETO_Calculator');

exports.callApiWeather = async (req, res) => {
    const currentTime = new Date().toLocaleDateString();

    const rs = await checkWeather7days(currentTime);
    console.log(rs);

    if (rs == false) {
        await fetch(weather.url7days)
            .then(res => res.json())
            .then(data => {
                predictWeather7days(data)
            })
    }

    await fetch(weather.urlToday)
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
    const icon = data.data[0].weather.icon
    const weatherTitle = data.data[0].weather.description;

    const solarRad = data.data[0].ghi;
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
    const dataFromWaterVolume = await firebaseStore.getDataFromWaterVolume();

    let ETcOfWater = [];
    let waterVolume = [];

    // nếu có yêu cầu tính với diện tích và kc chỉ định
    if (req.query.kc || req.query.area) {
        const kc = req.query.kc;
        const area = req.query.area;

        console.log(area);


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
        if (area != null && area != '' && area != ' ') {

            const predictWaterVolume = await calculateWaterVolumes(area, kc);

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

        //không có diện tích thì mặc định sẽ tính với diện tích là 500 m2
        const predictWaterVolume = await calculateWaterVolumes(500, kc);
        let humd = dataFromWaterVolume.map(doc => doc.humd);
        let millisecond = dataFromWaterVolume.map(doc => doc.millisecond);

        ETcOfWater.forEach((el) => {
            waterVolume.push(calculateCurrentWaterVolume(el, 500));
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

    //mặc định tính với diện tích 500 và kc 0.85 nếu người dùng không yêu cầu
    const predictWaterVolume = await calculateWaterVolumes(500);

    // const user = req.user;

    // if (user) {
    //     const rs = await firebaseStore.getAllGardens(user);
    //     let data = rs.reverse();
    //     console.log(data[0]);


    // }

    let humd = dataFromWaterVolume.map(doc => doc.humd);
    let millisecond = dataFromWaterVolume.map(doc => doc.millisecond);

    ETcOfWater = dataFromWaterVolume.map(doc => doc.waterVolume.kc_085);

    ETcOfWater.forEach((el) => {
        waterVolume.push(calculateCurrentWaterVolume(el, 500));
    })

    return res.status(200).json({
        status: 'success',
        user: res.locals.user,
        data: {
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
    const { nameGarden, typeGarden, method, area, note, latitude, longitude } = req.body;
    const user = req.user;

    if (!user) {
        return res.status(401).json({
            status: 'fail',
            message: "Vui lòng đăng nhập"
        });
    }

    if (!nameGarden || !typeGarden || !method || !area || !latitude || !longitude) {
        return res.status(400).json({
            status: 'fail',
            message: "Vui lòng nhập đủ thông tin"
        });
    }

    await firebaseStore.addGarden(user, nameGarden, typeGarden, method, area, note, latitude, longitude);

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
    const { nameGarden, typeGarden, method, area, note, latitude, longitude } = req.body;
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
        "longitude": longitude
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