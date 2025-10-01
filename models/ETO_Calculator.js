const {
  query,
  collection,
  where,
  getDocs,
  orderBy,
  limit,
} = require("firebase/firestore");
const firebaseStore = require("../models/firebase");
const firebaseConfig = require("../config/config_firebase");
const weather = require("../config/config_weather");
const { fetchAndSaveWeather } = require("../utils/weatherUtils");

let highTemp7Days = [];
let lowTemp7Days = [];
let iconWeather = [];
let temp = [];
let datetime = [];
let highTemp;
let lowTemp;

// const callApiWeather = async () => {
//   const currentTime = new Date().toLocaleDateString();

//   const rs = await checkWeather7days(currentTime);
//   console.log(rs);

//   if (rs == false) {
//     await fetch(weather.url7days)
//       .then((res) => res.json())
//       .then((data) => {
//         predictWeather7days(data);
//       });
//   }
//   await fetch(weather.urlToday)
//     .then((res) => res.json())
//     .then((data) => {
//       dataWeatherCurrent(data);
//     });
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

const callApiWeather = async () => {
    await fetchAndSaveWeather();
};

const RaMatrix = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  [
    13.0152, 14.076, 15.0552, 15.4632, 15.3408, 15.096, 15.1368, 15.3, 15.1368,
    14.3208, 13.2192, 12.648,
  ],
];

const calculateETo7days = (maxTemp, minTemp, month) => {
  let Ra = RaMatrix[1][month - 1];
  const avgTemp = (maxTemp + minTemp) / 2;
  const tempDiff = maxTemp - minTemp;
  const ETo = 0.0023 * (avgTemp + 17.8) * Math.sqrt(tempDiff) * Ra;

  return ETo;
};

exports.getWeatherETo7days = async () => {
  const weatherData = await firebaseStore.getWeather7days();

  if (!weatherData || !weatherData.maxTemp || !weatherData.minTemp) {
    console.error("Không có dữ liệu thời tiết hợp lệ!");
    return;
  }
  const date = weatherData.timestamp.toString();
  const month = date.substring(0, date.indexOf("/"));
  const maxTemps = weatherData.maxTemp;
  const minTemps = weatherData.minTemp;

  const EToResults = maxTemps.map((maxTemp, index) => {
    const minTemp = minTemps[index];
    return calculateETo7days(maxTemp, minTemp, month);
  });

  return EToResults;
};

exports.calculateETc = async (kc) => {
  if (!kc || kc == 0) kc = 0.85;
  try {
    let EToList = await this.getWeatherETo7days();

    if (!EToList || !Array.isArray(EToList)) {
      // throw new Error('Danh sách ETo không hợp lệ hoặc trống!');
      console.log("call api để nhận dữ liệu mới");
      await callApiWeather();
      ETcList = await calculateETc();
    }

    const ETcList = EToList.map((ETo) => ETo * kc);

    return ETcList;
  } catch (error) {
    console.error("Lỗi khi tính ETc:", error);
    return [];
  }
};

exports.calculateWaterVolumes = async (areaInSquareMeters, kc) => {
  try {
    const ETcList = await this.calculateETc(kc);

    if (!ETcList || !Array.isArray(ETcList)) {
      throw new Error("Danh sách ETc không hợp lệ hoặc trống!");
    }

    const waterVolumes = ETcList.map((ETc) => {
      const volumeInLiters = ETc * areaInSquareMeters;
      return volumeInLiters;
    });

    return waterVolumes;
  } catch (error) {
    console.error("Lỗi khi tính thể tích nước:", error);
    return [];
  }
};

// Trả về số ngày của năm
function getDayOfYear(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return null;
  }

  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay) + 1;

  return dayOfYear;
}

// Trả về khoảng cách từ Trái Đất đến Mặt Trời D_r (CT23)
function calculateDistanceToSun(J) {
  const pi = Math.PI;
  const distance = 1 + 0.033 * Math.cos((2 * pi * J) / 365);

  return distance;
}

//Trả về độ nghiêng của Mặt Trời (radian) (CT24)
function calculateSolarInclination(J) {
  const pi = Math.PI;
  const inclination = 0.409 * Math.sin(((2 * pi) / 365) * J - 1.39);

  return inclination;
}

//góc điều chỉnh theo mùa cho ngày thứ b(radian)   (CT33)
function calculateSeasonalAdjustment(J) {
  const pi = Math.PI;
  const b = (2 * pi * (J - 81)) / 364;

  return b;
}

// Hệ số điều chỉnh theo mùa S_c (CT32)
function calculateAdjustmentCoefficient(b) {
  const Sc =
    0.1645 * Math.sin(2 * b) - 0.1255 * Math.cos(b) - 0.025 * Math.sin(b);

  return Sc;
}

// Góc giờ mặt trời tại điểm giữa của chu kỳ giá trị ω (radian) (CT31)
function calculateSolarAngle(Lm, Sc, t) {
  const Lz = 255;
  const pi = Math.PI;
  const omega = (pi / 12) * (t + 0.06666 * (Lz - Lm) + Sc - 12);

  return omega;
}

// góc giờ mặt trời ở "đầu" chu kỳ omega1 ω₁(radian)(CT29)
function calculateSolarHourAngle(omega, t1) {
  const pi = Math.PI;
  const omega1 = omega - (pi * t1) / 24;

  return omega1;
}

// góc giờ mặt trời ở "cuối" chu kỳ omega2 ω2(radian)(CT29)
function calculateSolarHourEnd(omega, t1) {
  const pi = Math.PI;
  const omega2 = omega + (pi * t1) / 24;

  return omega2;
}

//bức xạ ngoài Trái Đất Ra (MJ m-2 hour-1) (CT28)
function calculateSolarRadiation(phi, Date, t, Lm) {
  const t1 = 1;
  const J = getDayOfYear(Date);
  const b = calculateSeasonalAdjustment(J);
  const D_r = calculateDistanceToSun(J);
  const delta = calculateSolarInclination(J);
  const S_c = calculateAdjustmentCoefficient(b);
  const omega = calculateSolarAngle(Lm, S_c, t);
  const omega1 = calculateSolarHourAngle(omega, t1);
  const omega2 = calculateSolarHourEnd(omega, t1);
  const Gsc = 0.082;
  const pi = Math.PI;

  const sunsetHourAngle = calculateSunsetHourAngle(phi, J);

  if (omega < -sunsetHourAngle || omega > sunsetHourAngle) {
    console.log(`mặt trời ở dưới đường chân trời, R_a bằng 0`);
    return 0;
  }

  const Ra =
    ((12 * 60) / pi) *
    Gsc *
    D_r *
    ((omega2 - omega1) * Math.sin(phi) * Math.sin(delta) +
      Math.cos(delta) * Math.cos(phi) * (Math.sin(omega2) - Math.sin(omega1)));

  return Ra;
}

// Tính chỉ số Stefan-Boltzmann (MJ m-2 giờ-1)
function stefanBoltzmann(T_c) {
  const sigma = 2.043e-10;
  const T_k = T_c + 273.16;
  const T_k4 = Math.pow(T_k, 4);
  const sigma_T_k4 = sigma * T_k4;

  return sigma_T_k4;
}

// Trả về giá trị áp suất hơi bão hòa e0 (kPa) (CT11)
function saturationVaporPressure(T_hr) {
  const e0 = 0.6108 * Math.exp((17.27 * T_hr) / (T_hr + 237.3));

  return e0;
}

// Trả về áp suất hơi thực tế trung bình hàng giờ e_a (kPa) (CT54)
function actualVaporPressure(RH_hr, T_hr) {
  const e0 = saturationVaporPressure(T_hr);
  const e_a = e0 * (RH_hr / 100);

  return e_a;
}

//bức xạ mặt trời trong bầu trời quang đãng Rso (MJ m-2 giờ-1) (CT37)
function calculateRso(Ra, Z) {
  const Rso = (0.75 + 2 * Math.pow(10, -5) * Z) * Ra;

  return Rso;
}

// Trả về bức xạ sóng dài ròng R_nl (MJ m-2 giờ-1) (CT39)
function calculateLongwaveRadiation(R_s, T_c, RH_hr, Ra, Z) {
  const e_a = actualVaporPressure(RH_hr, T_c);
  const R_so = calculateRso(Ra, Z);

  let ratio;
  if (R_so === 0) {
    ratio = 0.8;
  } else {
    ratio = R_s / R_so;
  }

  const R_nl =
    stefanBoltzmann(T_c) *
    (0.34 - 0.14 * Math.sqrt(e_a)) *
    (1.35 * ratio - 0.35);

  return R_nl;
}

//Góc giờ hoàng hôn, ω_s omegas (Rad) (CT25)
function calculateSunsetHourAngle(phi, J) {
  const delta = calculateSolarInclination(J);
  const hourAngle = Math.acos(-Math.tan(phi) * Math.tan(delta));
  console.log(`giá trị ω_s =  ${hourAngle}`);

  return hourAngle;
}

// bức xạ sóng ngắn thuần R_ns (MJ m-2 giờ-1) (CT38)
function calculateNetShortwaveRadiation(R_s) {
  const alpha = 0.23; // Hệ số phản xạ mặt đất (albedo)
  const R_ns = (1 - alpha) * R_s;

  return R_ns;
}

//bức xạ ròng R_n (MJ m-2 giờ-1) (CT40)
function calculateNetRadiation(R_s, T_c, RH_hr, Ra, Z) {
  console.log(`R_s =  ${R_s}`);
  console.log(`T_c =  ${T_c}`);
  console.log(`RH_hr =  ${RH_hr}`);
  console.log(`Ra =  ${Ra}`);
  console.log(`Rns =  ${calculateNetShortwaveRadiation(R_s)}`);
  console.log(`Rnl =  ${calculateLongwaveRadiation(R_s, T_c, RH_hr, Ra, Z)}`);
  const R_n =
    calculateNetShortwaveRadiation(R_s) -
    calculateLongwaveRadiation(R_s, T_c, RH_hr, Ra, Z);

  return R_n;
}

// thông lượng nhiệt G_hr  (MJ m-2 giờ-1) (CT46 , CT45)
function calculateHeatFlux(R_n) {
  const G_hr = 0.1 * R_n;

  return G_hr;
}

//Áp suất khí quyển P (kPa) (CT7)
function calculatePressure(Z) {
  const P = 101.3 * Math.pow((293 - 0.0065 * Z) / 293, 5.26);

  return P;
}

//hằng số tâm trắc học (kPa °C-1)
function calculatePsychrometricConstant(Z) {
  const P = calculatePressure(Z);
  const g = 0.665e-3 * P;

  return g;
}

//độ dốc của đường cong áp suất hơi bão hòa ở nhiệt độ không khí T [kPa °C-1](CT13)
function calculateDelta(T) {
  // T: Nhiệt độ (°C)

  const numerator = 4098 * 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
  const denominator = Math.pow(T + 237.3, 2);
  const delta = numerator / denominator;

  return delta;
}

//ETo (mm/giờ)  (CT6)
function calculateETo(Ra, R_s, RH_hr, T_hr, u_2, Z) {
  const gamma = calculatePsychrometricConstant(Z);
  console.log(`gamma = ${gamma}`);

  const R_n = calculateNetRadiation(R_s, T_hr, RH_hr, Ra, Z);
  console.log(`R_n =  ${R_n}`);

  const G = calculateHeatFlux(R_n);
  console.log(`G =  ${G}`);

  const Delta = calculateDelta(T_hr);
  console.log(`Delta =  ${Delta}`);

  const e_a = actualVaporPressure(RH_hr, T_hr);
  console.log(`e_a =  ${e_a}`);

  // Tính giá trị của e trong công thức
  const e0 = saturationVaporPressure(T_hr);
  console.log(`e0  =  ${e0}`);

  // Tính ETo theo công thức
  const numerator =
    0.408 * Delta * (R_n - G) + gamma * (37 / (T_hr + 273)) * u_2 * (e0 - e_a);
  const denominator = Delta + gamma * (1 + 0.34 * u_2);

  const ETo = numerator / denominator;

  return ETo < 0 ? Math.abs(ETo) : ETo;
}

//W/m^2 => MJ m-2 giờ-1
function WatToJun(ghi) {
  return (ghi * 0.0864) / 24;
}

//ETc (mm/giờ)
function calculateDailyETc(ETo, Kc) {
  try {
    if (ETo === null || Kc === null) {
      throw new Error("Không thể lấy ETo.");
    }
    const ETc = ETo * Kc;

    return ETc;
  } catch (error) {
    console.error("Lỗi khi tính chỉ số ETc cho 1 giờ:", error);
    return null;
  }
}

// Tính lượng nước dựa trên diện tích và ETc (lít)
exports.calculateCurrentWaterVolume = (ETc, areaInSquareMeters) => {
  try {
    if (ETc === null) {
      throw new Error("Không thể tính lượng nước vì chỉ số ETc không hợp lệ.");
    }
    const waterVolume = ETc * areaInSquareMeters; // 1 mm nước/m² tương đương 1 lít/m²
    return waterVolume; // Trả về lượng nước (lít)
  } catch (error) {
    console.error("Lỗi khi tính lượng nước hiện tại:", error);
    return null;
  }
};

const getSolar = async () => {
  let data = await firebaseStore.getWeatherToday();
  const currentTime = new Date().getTime();

  if (data != null) {
    console.log("solar from weahter: ", data.solar);
  } else {
    console.log("Chua co solar hom nay");
  }

  if (data == null) {
    console.log("Call new api weather ");
    await callApiWeather();
    data = await firebaseStore.getWeatherToday();
  } else if (currentTime - data.currentTime > 55 * 60 * 1000) {
    console.log("Call Api after timing greater than 60 minutes");
    await callApiWeather();
    data = await firebaseStore.getWeatherToday();
  }

  const solar = WatToJun(data.solar);
  if (solar) {
    console.log("solar: ", solar);
  }

  return solar;
};

const getDataFromSensor = async () => {
  const data = await firebaseStore.getDataFromSensorData();

  return data[0];
};

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function convertLongitude(longitude) {
  return 360 - longitude;
}

exports.handleWaterVolumeToday = async () => {
  let dataSensor = await getDataFromSensor();
  time = dataSensor.currentTime;

  const hour = time.substring(0, time.indexOf(":"));
  let t1 = hour - 0.5;
  console.log("t1", t1);

  const phi = degreesToRadians(10.094424);
  const Lm16 = convertLongitude(105.671879);
  const today = new Date();

  const Ra = calculateSolarRadiation(phi, today, t1, Lm16);
  console.log(`Bức xạ ngoài trái đất R_a là ${Ra.toFixed(2)} MJ m-2 hour-1`);

  const R_s = await getSolar();
  let RH_hr = parseFloat(dataSensor.humidityInSideHouse);
  let T_hr = parseFloat(dataSensor.temp);
  const u_2 = 1;
  const Z = 0;

  const ETo = calculateETo(Ra, R_s, RH_hr, T_hr, u_2, Z);
  console.log(`ETo là ${ETo} mm/hour`);

  const ETc_kc05 = calculateDailyETc(ETo, 0.5);
  const ETc_kc085 = calculateDailyETc(ETo, 0.85);
  const ETc_kc06 = calculateDailyETc(ETo, 0.6);
  console.log(`ETc voi 0.5 là ${ETc_kc05} lít`);
  console.log(`ETc voi 0.85 là ${ETc_kc085} lít`);
  console.log(`ETc voi 0.6 là ${ETc_kc06} lít`);

  // const currentVolumeWithKc05 = this.calculateCurrentWaterVolume(ETc_kc05, areaInSquareMeters);
  // const currentVolumeWithKc085 = this.calculateCurrentWaterVolume(ETc_kc085, areaInSquareMeters);
  // const currentVolumeWithKc06 = this.calculateCurrentWaterVolume(ETc_kc06, areaInSquareMeters);
  // console.log(`Lượng nước với kc05 là ${currentVolumeWithKc05} lít`);
  // console.log(`Lượng nước với kc085 là ${currentVolumeWithKc085} lít`);
  // console.log(`Lượng nước với kc06 là ${currentVolumeWithKc06} lít`);

  // await firebaseStore.addDataWaterVolume(dataSensor.humd, ETc_kc05, ETc_kc085, ETc_kc06, today.getTime());
  await firebaseStore.addDataWaterVolume(
    dataSensor.humd,
    ETc_kc05,
    ETc_kc085,
    ETc_kc06,
    today.getTime(),
    { ETo } // Lưu ETo để FE có thể suy ETc theo Kc động
  );
};

// Tính Kc theo giai đoạn (dựa vào cropType + startDate)
exports.getKcForDate = (crop, startDateMs, dateMs) => {
  if (!crop || !startDateMs || !dateMs) return { stage: "unknown", kc: 0.85 };

  const {
    kcInit = 0.4,
    kcMid = 1.1,
    kcEnd = 0.8,
    daysInit = 20,
    daysDev = 30,
    daysMid = 40,
    daysLate = 30,
  } = crop;

  const d = Math.floor((dateMs - startDateMs) / (24 * 60 * 60 * 1000));
  const t1 = daysInit;
  const t2 = t1 + daysDev;
  const t3 = t2 + daysMid;
  const t4 = t3 + daysLate;

  if (d < 0) return { stage: "before", kc: kcInit };
  if (d <= t1) return { stage: "init", kc: kcInit };
  if (d <= t2) {
    const p = (d - t1) / Math.max(1, daysDev);
    return { stage: "dev", kc: kcInit + p * (kcMid - kcInit) };
  }
  if (d <= t3) return { stage: "mid", kc: kcMid };
  if (d <= t4) {
    const p = (d - t3) / Math.max(1, daysLate);
    return { stage: "late", kc: kcMid + p * (kcEnd - kcMid) };
  }
  return { stage: "finished", kc: kcEnd };
};

// Dự báo 7 ngày với danh sách Kc theo từng ngày
exports.calculateWaterVolumesDynamic = async (areaInSquareMeters, kcList) => {
  try {
    const EToList = await this.getWeatherETo7days(); // 7 giá trị ETo
    if (!Array.isArray(EToList) || EToList.length < 7) return [];
    const waterVolumes = EToList.map(
      (ETo, idx) =>
        ETo * (kcList[idx] ?? kcList.at(-1) ?? 0.85) * areaInSquareMeters
    );
    return waterVolumes;
  } catch (e) {
    console.error("calculateWaterVolumesDynamic error:", e);
    return [];
  }
};
