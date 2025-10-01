const catchAsync = require("../middlewares/catchAsync");
const firebaseStore = require("../models/firebase");

// const weather = require("../config/config_weather");
// const { calculateWaterVolumes, handleWaterVolumeToday, handleWaterVolumeTodayForKcSelected, calculateCurrentWaterVolume } = require('../models/ETO_Calculator');
const {
  getKcForDate,
  calculateCurrentWaterVolume,
  calculateWaterVolumes,
  calculateWaterVolumesDynamic,
} = require("../models/ETO_Calculator");
const { fetchAndSaveWeather } = require("../utils/weatherUtils");

let highTemp7Days = [];
let lowTemp7Days = [];
let iconWeather = [];
let temp = [];
let datetime = [];
let highTemp;
let lowTemp;

// service để gọi và lưu weather
// async function fetchAndSaveWeather() {
//   const currentTime = new Date().toLocaleDateString();

//   const rs = await checkWeather7days(currentTime);

//   if (rs == false) {
//     const data7days = await fetch(weather.url7days).then((res) => res.json());
//     await predictWeather7days(data7days);
//   }

//   const dataToday = await fetch(weather.urlToday).then((res) => res.json());
//   await dataWeatherCurrent(dataToday);

//   return true;
// }

// exports.callApiWeather = async (req, res) => {
//   await fetchAndSaveWeather();
//   res.status(200).json({ status: "success" });
// };



// async function checkWeather7days(time) {
//   const data = await firebaseStore.getWeather7days();
//   if (data == null) return false;

//   if (data.timestamp == time) {
//     highTemp = data.maxTemp[0];
//     lowTemp = data.minTemp[0];
//     return true;
//   } else {
//     return false;
//   }
// }

// function dataWeatherCurrent(data) {
//   const icon = data.data[0].weather.icon;
//   const weatherTitle = data.data[0].weather.description;
//   const solarRad = data.data[0].ghi;
//   console.log(`Solar Rad: ${solarRad}`);
//   const temp = data.data[0].temp;
//   const humidity = data.data[0].rh;
//   firebaseStore.addDataForWeatherToday(
//     highTemp,
//     lowTemp,
//     temp,
//     icon,
//     humidity,
//     solarRad,
//     weatherTitle
//   );
// }

// function predictWeather7days(data) {
//   highTemp = data.data[0].app_max_temp;
//   lowTemp = data.data[0].app_min_temp;

//   for (let i = 0; i < 7; i++) {
//     const date = data.data[i].datetime;
//     // const day = new Date(date).getDay();
//     datetime.push(date);
//     highTemp7Days.push(data.data[i].app_max_temp);
//     lowTemp7Days.push(data.data[i].app_min_temp);

//     const icon = data.data[i].weather.icon;
//     iconWeather.push(icon);

//     const t = data.data[i].temp;
//     temp.push(t);
//   }
//   firebaseStore.addDataForWeather7days(
//     highTemp7Days,
//     lowTemp7Days,
//     iconWeather,
//     temp,
//     datetime
//   );
// }

exports.callApiWeather = async (req, res) => {
  await fetchAndSaveWeather();
  res.status(200).json({ status: "success" });
};


//mô tả: lấy dữ liệu cho trang home (dashboard)
exports.getHome = catchAsync(async (req, res) => {
  const { gardenId, kc, area } = req.query;

  let dataWeatherToday = await firebaseStore.getWeatherToday();
  let dataWeather7days = await firebaseStore.getWeather7days();

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (
    dataWeatherToday === null ||
    dataWeather7days === null ||
    now - dataWeatherToday.currentTime >= oneHour
  ) {
    await fetchAndSaveWeather();
    dataWeatherToday = await firebaseStore.getWeatherToday();
    dataWeather7days = await firebaseStore.getWeather7days();
  }

  const dataFromWaterVolumeRaw = await firebaseStore.getDataFromWaterVolume();
  const dataWaterVolumeYesterdayRaw =
    await firebaseStore.getWaterDataFromYesterday();

  // Xác định area và kcNow (từ season/crop)
  let areaToUse = area ? Number(area) : 1000;
  let kcNow = 0.85;
  let stageInfo = null;

  if (gardenId) {
    const garden = await firebaseStore.getGardenById(req.user, gardenId);
    if (garden?.area) areaToUse = Number(garden.area);

    const seasons = await firebaseStore.getSeasons(req.user, gardenId);
    const now = Date.now();
    const active = seasons.find((s) => now >= s.startDate && now <= s.endDate);
    if (active) {
      const crop = await firebaseStore.getCropById(req.user, active.cropId);
      const sInfo = getKcForDate(crop, active.startDate, now);
      kcNow = sInfo.kc;
      stageInfo = { ...sInfo, cropName: crop?.name || "" };
    }
  } else if (kc) {
    kcNow = Number(kc) || 0.85;
  }

  // Dự báo 7 ngày: nếu có season -> Kc động theo từng ngày
  let predictWaterVolume = [];
  if (gardenId && stageInfo) {
    const seasons = await firebaseStore.getSeasons(req.user, gardenId);
    const active = seasons.find(
      (s) => Date.now() >= s.startDate && Date.now() <= s.endDate
    );
    const crop = active
      ? await firebaseStore.getCropById(req.user, active.cropId)
      : null;
    const kcList = [];
    if (crop && active) {
      for (let i = 0; i < 7; i++) {
        const dayMs = Date.now() + i * 24 * 60 * 60 * 1000;
        kcList.push(getKcForDate(crop, active.startDate, dayMs).kc);
      }
      predictWaterVolume = await calculateWaterVolumesDynamic(
        areaToUse,
        kcList
      );
    }
    if (predictWaterVolume.length === 0) {
      predictWaterVolume = await calculateWaterVolumes(areaToUse, kcNow);
    }
  } else {
    predictWaterVolume = await calculateWaterVolumes(areaToUse, kcNow);
  }

  // Xử lý dữ liệu nước hôm nay và hôm qua
  const humd = dataFromWaterVolumeRaw.map((doc) => doc.humd);
  const millisecond = dataFromWaterVolumeRaw.map((doc) => doc.millisecond);
  const millisecondYesterday = dataWaterVolumeYesterdayRaw.map(
    (doc) => doc.millisecond
  );

  // Nếu ETo có sẵn -> ETc = ETo * kcNow; nếu không có, suy ra từ kc_085
  const waterVolume = dataFromWaterVolumeRaw.map((doc) => {
    const maybeETo =
      doc.ETo ??
      (doc.waterVolume?.kc_085 ? doc.waterVolume.kc_085 / 0.85 : null);
    if (maybeETo == null) return 0;
    const ETc = maybeETo * kcNow;
    return calculateCurrentWaterVolume(ETc, areaToUse);
  });

  const waterVolumeYesterday = dataWaterVolumeYesterdayRaw.map((doc) => {
    const maybeETo =
      doc.ETo ??
      (doc.waterVolume?.kc_085 ? doc.waterVolume.kc_085 / 0.85 : null);
    if (maybeETo == null) return 0;
    const ETc = maybeETo * kcNow;
    return calculateCurrentWaterVolume(ETc, areaToUse);
  });

  return res.status(200).json({
    status: "success",
    user: res.locals.user,
    data: {
      dataWeatherToday,
      dataWeather7days,
      stageInfo, // FE hiển thị giai đoạn + kc hiện tại
      predictWaterVolume,
      dataFromWaterVolume: {
        waterVolume,
        waterVolumeYesterday,
        humd,
        millisecond,
        millisecondYesterday,
      },
    },
  });
});

exports.getDataForChar = catchAsync(async (req, res) => {
  const kc = req.query.kc;
  const predictWaterVolume = await calculateWaterVolumes(1000, kc);
  const dataFromWaterVolume = await firebaseStore.getDataFromWaterVolume();

  res.status(200).json({
    data: {
      predictWaterVolume,
      dataFromWaterVolume,
    },
  });
});

exports.addDataWeatherToday = catchAsync(async (req, res) => {
  const { highTemp, lowTemp, temp, icon, humidity, solarRad, weatherTitle } =
    req.body;
  await firebaseStore.addDataForWeatherToday(
    highTemp,
    lowTemp,
    temp,
    icon,
    humidity,
    solarRad,
    weatherTitle
  );

  res.status(201).json({
    status: "success",
  });
});

exports.addDataForWeather7days = catchAsync(async (req, res) => {
  const { highTemp7Days, lowTemp7Days, iconWeather, temp, datetime } = req.body;
  await firebaseStore.addDataForWeather7days(
    highTemp7Days,
    lowTemp7Days,
    iconWeather,
    temp,
    datetime
  );

  res.status(201).json({
    status: "success",
  });
});

exports.getDataWeatherToday = catchAsync(async (req, res) => {
  const data = await firebaseStore.getWeatherToday();

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getDataWeather7Days = catchAsync(async (req, res) => {
  const data = await firebaseStore.getWeather7days();

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.addGardenInfo = catchAsync(async (req, res) => {
  const { nameGarden, typeGarden, method, area, note, latitude, longitude } =
    req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      status: "fail",
      message: "Vui lòng đăng nhập",
    });
  }

  if (
    !nameGarden ||
    !typeGarden ||
    !method ||
    !area ||
    !latitude ||
    !longitude
  ) {
    return res.status(400).json({
      status: "fail",
      message: "Vui lòng nhập đủ thông tin",
    });
  }

  await firebaseStore.addGarden(
    user,
    nameGarden,
    typeGarden,
    method,
    area,
    note,
    latitude,
    longitude
  );

  return res.status(201).json({
    status: "success",
  });
});

exports.getAllGardenInfo = catchAsync(async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      status: "fail",
      message: "Vui lòng đăng nhập",
    });
  }

  const data = await firebaseStore.getAllGardens(user);

  return res.status(200).json({
    status: "success",
    data,
  });
});

exports.getAllGardenInfoByName = catchAsync(async (req, res) => {
  const user = req.user;
  const { name } = req.params;
  if (!user) {
    return res.status(401).json({
      status: "fail",
      message: "Vui lòng đăng nhập",
    });
  }

  if (!name)
    return res.status(400).json({
      status: "fail",
      message: "Vui lòng nhập tên",
    });

  const data = await firebaseStore.getAllGardenByName(user, name);

  return res.status(200).json({
    status: "success",
    data,
  });
});

exports.updateGardenInfo = catchAsync(async (req, res) => {
  const { nameGarden, typeGarden, method, area, note, latitude, longitude } =
    req.body;
  const user = req.user;

  const { name } = req.params;

  if (!user) {
    return res.status(401).json({
      status: "fail",
      message: "Vui lòng đăng nhập",
    });
  }

  const updates = {
    nameGarden: nameGarden,
    typeGarden: typeGarden,
    method: method,
    area: area,
    note: note,
    latitude: latitude,
    longitude: longitude,
  };

  const rs = await firebaseStore.updateGarden(user, name, updates);

  if (rs) {
    return res.status(201).json({
      status: "success",
    });
  } else {
    return res.status(400).json({
      status: "fail",
    });
  }
});

exports.deleteGardenInfo = catchAsync(async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      status: "fail",
      message: "Vui lòng đăng nhập",
    });
  }

  const { nameGarden } = req.body;

  if (!nameGarden)
    return res.status(400).json({
      status: "fail",
      message: "Vui lòng cung cấp tên vườn",
    });

  const rs = await firebaseStore.deleteGarden(user, nameGarden);

  if (rs) {
    return res.status(200).json({
      status: "success",
    });
  } else {
    return res.status(400).json({
      status: "fail",
    });
  }
});

// lấy danh sách vườn có mùa vụ đang hoạt động để hiển thị trên dashboard
exports.getDashboardGardens = catchAsync(async (req, res) => {
  const activeSeasons = await firebaseStore.getActiveSeasons(req.user);
  const gardens = await firebaseStore.getAllGardens(req.user);
  const activeGardenIds = new Set(activeSeasons.map((s) => s.gardenId));
  const list = gardens
    .filter((g) => activeGardenIds.has(g.id))
    .map((g) => ({ id: g.id, nameGarden: g.nameGarden, area: g.area }));
  res.status(200).json({ status: "success", data: list });
});

exports.seedWaterVolume = async (req, res) => {
  await firebaseStore.seedWaterVolumeForToday();
  res.status(201).json({ status: "success" });
};

exports.getGardenById = catchAsync(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  if (!user)
    return res
      .status(401)
      .json({ status: "fail", message: "Vui lòng đăng nhập" });
  if (!id) return res.status(400).json({ status: "fail", message: "Thiếu id" });

  const data = await firebaseStore.getGardenById(user, id);
  if (!data)
    return res
      .status(404)
      .json({ status: "fail", message: "Không tìm thấy vườn" });

  return res.status(200).json({ status: "success", data });
});
