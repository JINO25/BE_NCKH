const { query, collection, where, getDocs, orderBy, limit } = require('firebase/firestore');
const firebaseStore = require('../models/firebase');
const firebaseConfig = require('../config/config_firebase');
const weather = require('../config/config_weather');

const callApiWeather = async () => {
    await fetch(weather.url7days)
        .then(res => res.json())
        .then(data => {
            predictWeather7days(data)
        })

    await fetch(weather.urlToday)
        .then(res => res.json())
        .then(data => {
            dataWeatherCurrent(data)
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

const RaMatrix = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    [13.0152, 14.076, 15.0552, 15.4632, 15.3408, 15.096, 15.1368, 15.3, 15.1368, 14.3208, 13.2192, 12.648]
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
        console.error('Không có dữ liệu thời tiết hợp lệ!');
        return;
    }

    const date = weatherData.timestamp.toString();

    const month = date.substring(0, date.indexOf('/'));

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
            console.log('call api để nhận dữ liệu mới');
            await callApiWeather();
            ETcList = await calculateETc();
        }

        const ETcList = EToList.map(ETo => ETo * kc);

        return ETcList;
    } catch (error) {
        console.error('Lỗi khi tính ETc:', error);
        return [];
    }
};

exports.calculateWaterVolumes = async (areaInSquareMeters, kc) => {

    try {
        const ETcList = await this.calculateETc(kc);

        if (!ETcList || !Array.isArray(ETcList)) {
            throw new Error('Danh sách ETc không hợp lệ hoặc trống!');
        }

        const waterVolumes = ETcList.map(ETc => {
            const volumeInLiters = ETc * areaInSquareMeters;
            return volumeInLiters;
        });

        return waterVolumes;
    } catch (error) {
        console.error('Lỗi khi tính thể tích nước:', error);
        return [];
    }
}

//Calculate ETo for today


// Trả về số ngày của năm
function getDayOfYear(date) {
    // Kiểm tra xem ngày đầu vào có hợp lệ không  
    if (!(date instanceof Date) || isNaN(date)) {
        return null; // Nếu không hợp lệ, trả về null  
    }

    // Tạo một đối tượng ngày cho ngày đầu tiên của năm  
    const startOfYear = new Date(date.getFullYear(), 0, 1);

    // Tính số ngày đã trôi qua từ đầu năm đến ngày hiện tại  
    const diff = date - startOfYear; // Tính hiệu giữa hai ngày  
    const oneDay = 1000 * 60 * 60 * 24; // Số milliseconds trong một ngày  

    // Lấy số ngày trôi qua và cộng với 1  
    const dayOfYear = Math.floor(diff / oneDay) + 1;

    return dayOfYear; // Trả về số ngày của năm  
}

// Trả về khoảng cách từ Trái Đất đến Mặt Trời D_r (CT23)
function calculateDistanceToSun(J) {
    // Khởi tạo hằng số Pi  
    const pi = Math.PI;

    // Tính khoảng cách từ Trái Đất đến Mặt Trời (AU)  
    const distance = 1 + 0.033 * Math.cos((2 * pi * J) / 365);

    return distance; // Trả về khoảng cách (AU)  
}


//Trả về độ nghiêng của Mặt Trời (radian) (CT24)
function calculateSolarInclination(J) {
    // Khởi tạo hằng số Pi  
    const pi = Math.PI;

    // Tính độ nghiêng mặt trời theo công thức  
    const inclination = 0.409 * Math.sin((((2 * pi) / 365) * J) - 1.39);
    // console.log(`Độ nghiêng mặt trời vào ngày thứ ${J} là ${inclination} rad`);
    return inclination; // Trả về độ nghiêng (radian)  
}

//góc điều chỉnh theo mùa cho ngày thứ b (CT33)
function calculateSeasonalAdjustment(J) {
    const pi = Math.PI;

    // Tính b theo công thức  
    const b = (2 * pi * (J - 81)) / 364;

    return b; // Trả về giá trị b (radian)  
}



// Hệ số điều chỉnh theo mùa S_c (CT32)
function calculateAdjustmentCoefficient(b) {

    // Tính S_c theo công thức  
    const Sc = 0.1645 * Math.sin(2 * b) -
        0.1255 * Math.cos(b) -
        0.025 * Math.sin(b);

    return Sc; // Trả về giá trị S_c  
}




// Góc giờ mặt trời tại điểm giữa của chu kỳ giá trị ω (CT31)
function calculateSolarAngle(Lm, Sc, t) {
    // Lm là Kinh độ cụ thể tại vị trí tính toán
    const Lz = 255; //trung tâm kinh độ múi giờ số 7 
    // const Lz = 15;
    const pi = Math.PI;
    // Tính góc Mặt Trời ω theo công thức  
    const omega = (pi / 12) * ((t + 0.06666 * (Lz - Lm) + Sc) - 12);
    return omega; // Trả về giá trị ω (radian)  
}


// góc giờ mặt trời ở "đầu" chu kỳ omega1 ω1(CT29)
function calculateSolarHourAngle(omega, t1) {
    //  t₁ là số (giờ) được tính từ đầu đến cuối chu kỳ(có thể thay đổi)
    const pi = Math.PI;

    // Tính góc giờ mặt trời ω₁ theo công thức  
    const omega1 = omega - (pi * t1) / 24;

    return omega1; // Trả về giá trị ω₁ (radian)  
}



// góc giờ mặt trời ở "cuối" chu kỳ omega2 ω2 (CT29)
function calculateSolarHourEnd(omega, t1) {
    const pi = Math.PI;

    // Tính góc giờ mặt trời ω₁ theo công thức  
    const omega2 = omega + (pi * t1) / 24;

    return omega2; // Trả về giá trị ω2 (radian)  
}


//bức xạ ngoài Trái Đất Ra (CT28) 
function calculateSolarRadiation(phi, Date, t, Lm) {

    //t điểm giữa của khoảng thời gian cần tính  (xét về thời gian chọn tưới)
    //Date ngày hiện tại 
    //Lm là kinh độ tại vị trí tính so với phía tây Greenwich do Cần Thơ ở phía đông nên lấy kinh độ trừ cho 180
    //phi vĩ độ đơn vị Rad 

    const t1 = 1;   //tổng giờ từ đầu chu kì tới cuối chu kì        //cứng
    const J = getDayOfYear(Date);   //ngày thứ trong năm 
    const b = calculateSeasonalAdjustment(J);
    const D_r = calculateDistanceToSun(J);
    const delta = calculateSolarInclination(J);
    const S_c = calculateAdjustmentCoefficient(b);
    const omega = calculateSolarAngle(Lm, S_c, t);
    const omega1 = calculateSolarHourAngle(omega, t1);
    const omega2 = calculateSolarHourEnd(omega, t1);
    const Gsc = 0.0820; // Giá trị bức xạ mặt trời trung bình (MJ m-2 hour-1)  
    const pi = Math.PI;

    // Tính góc giờ hoàng hôn  
    const sunsetHourAngle = calculateSunsetHourAngle(phi, J);

    // Kiểm tra điều kiện tính R_a  
    if (omega < -sunsetHourAngle || omega > sunsetHourAngle) {
        console.log(`mặt trời ở dưới đường chân trời, R_a bằng 0`);
        return 0; // Nếu mặt trời ở dưới đường chân trời, R_a bằng 0  
    }

    // Tính bức xạ R_a theo công thức  
    const Ra = (12 * 60) / pi * Gsc * D_r *
        ((omega2 - omega1) * Math.sin(phi) * Math.sin(delta) +
            Math.cos(delta) * Math.cos(phi) * (Math.sin(omega2) - Math.sin(omega1)));

    return Ra; // Trả về giá trị bức xạ R_a  MJ m-2 hour-1
}


// Tính chỉ số Stefan-Boltzmann 
function stefanBoltzmann(T_c) {
    // Hằng số Stefan-Boltzmann  
    const sigma = 2.043e-10; // MJ m⁻² hour⁻¹  

    // Chuyển đổi từ độ C sang Kelvin  
    const T_k = T_c + 273.16;

    // Tính T^4  
    const T_k4 = Math.pow(T_k, 4);

    // Tính chỉ số Stefan-Boltzmann  
    const sigma_T_k4 = sigma * T_k4;

    return sigma_T_k4;      //MJ m-2 giờ-1
}
// Trả về giá trị áp suất hơi bão hòa e0 (CT11)
function saturationVaporPressure(T_hr) {
    // T là nhiệt độ không khí (độ C)  

    // Áp suất hơi bão hòa  
    const e0 = 0.6108 * Math.exp((17.27 * T_hr) / (T_hr + 237.3));

    return e0; // Trả về giá trị áp suất hơi bão hòa (kPa)  
}

// Trả về áp suất hơi thực tế trung bình hàng giờ e_a (CT54)
function actualVaporPressure(RH_hr, T_hr) {
    // RH_hr: Độ ẩm tương đối trung bình hàng giờ(%) nhập vào  
    // T_hr: Nhiệt độ trung bình hàng giờ(°C) nhập vào  

    // Tính áp suất hơi bão hòa ở nhiệt độ khôg khí 
    const e0 = saturationVaporPressure(T_hr);

    // Tính áp suất hơi thực tế
    const e_a = e0 * (RH_hr / 100);

    return e_a; // Trả về áp suất hơi thực tế trung bình hàng giờ (kPa)  
}

//bức xạ mặt trời trong bầu trời quang đãng Rso (CT37)
function calculateRso(Ra, Z) {
    // Ra: Bức xạ mặt trời toàn phần (đơn vị MJ m-2 hour-1)  
    // Z: Độ cao (m); mặc định là 0  

    // Tính bức xạ mặt trời quan đãng Rso  
    const Rso = (0.75 + 2 * Math.pow(10, -5) * Z) * Ra;

    return Rso; // Trả về bức xạ mặt trời quan đãng  MJ m-2 giờ-1
}


// Trả về bức xạ sóng dài ròng R_nl (CT39)
function calculateLongwaveRadiation(R_s, T_c, RH_hr, Ra, Z) {
    const e_a = actualVaporPressure(RH_hr, T_c); // Nhiệt độ trung bình và độ ẩm không khí trung bình theo giờ  
    const R_so = calculateRso(Ra, Z);

    // Tính tỉ lệ R_s / R_so  
    let ratio;
    if (R_so === 0) {
        ratio = 0.8; // Nếu R_so bằng 0, sử dụng tỉ lệ 0.8  
    } else {
        ratio = R_s / R_so; // Tính tỉ lệ thông thường  
    }

    // Tính bức xạ sóng dài ròng  
    const R_nl = stefanBoltzmann(T_c) *
        (0.34 - 0.14 * Math.sqrt(e_a)) *
        (1.35 * ratio - 0.35);

    return R_nl; // Trả về bức xạ sóng dài ròng (MJ m-2 giờ-1)  
}

//Góc giờ hoàng hôn, ω_s omegas (CT25)
function calculateSunsetHourAngle(phi, J) {
    // Convert latitude (φ) and declination (δ) từ độ sang radian  
    // const this. = phi;  
    const delta = calculateSolarInclination(J);

    // Tính góc giờ hoàng hôn (ω_s) theo công thức  
    const hourAngle = Math.acos(-Math.tan(phi) * Math.tan(delta));
    console.log(`giá trị ω_s =  ${hourAngle}`);

    // Chuyển đổi góc từ radian sang độ  
    return hourAngle; // Trả về ω_s omegas(Rad)  
}

// bức xạ sóng ngắn thuần R_ns (CT38)
function calculateNetShortwaveRadiation(R_s) {
    const alpha = 0.23; // Hệ số phản xạ mặt đất (albedo)  

    // Tính bức xạ sóng ngắn thuần R_ns  
    const R_ns = (1 - alpha) * R_s;

    return R_ns; // Trả về bức xạ sóng ngắn thuần (MJ m-2 giờ-1)  
}


//bức xạ ròng R_n (CT40)
function calculateNetRadiation(R_s, T_c, RH_hr, Ra, Z) {
    console.log(`R_s =  ${R_s}`);
    console.log(`T_c =  ${T_c}`);
    console.log(`RH_hr =  ${RH_hr}`);
    console.log(`Ra =  ${Ra}`);
    console.log(`Rns =  ${calculateNetShortwaveRadiation(R_s)}`);
    console.log(`Rnl =  ${calculateLongwaveRadiation(R_s, T_c, RH_hr, Ra, Z)}`);
    // Tính bức xạ ròng R_n  
    const R_n = calculateNetShortwaveRadiation(R_s) - calculateLongwaveRadiation(R_s, T_c, RH_hr, Ra, Z);

    return R_n; // Trả về bức xạ ròng (MJ m-2 giờ-1)  
}

// thông lượng nhiệt G_hr   (CT46, 45)
function calculateHeatFlux(R_n) {
    // R_n: Bức xạ ròng (MJ m-2 giờ-1)  

    // Tính thông lượng nhiệt G_hr  
    const G_hr = 0.1 * R_n;

    return G_hr; // Trả về thông lượng nhiệt G_hr (MJ m-2 giờ-1)  
}


//Áp suất khí quyển P (kPa) (CT7)
function calculatePressure(Z) {
    // z: độ cao (m)  

    // Tính áp suất P theo công thức  
    const P = 101.3 * Math.pow((293 - 0.0065 * Z) / 293, 5.26);

    return P; // Trả về áp suất (kPa)  
}

function calculatePsychrometricConstant(Z) {
    // P: Áp suất khí quyển (kPa)  
    const P = calculatePressure(Z)
    // Tính hằng số tâm trắc học C  
    const g = 0.665e-3 * P; // 0.665 × 10^(-3)  

    return g; // Trả về hằng số tâm trắc học (kPa °C-1)  
}


//độ dốc của đường cong áp suất hơi bão hòa ở nhiệt độ không khí T [kPa °C-1]
//(CT13)
function calculateDelta(T) {
    // T: Nhiệt độ (°C)  

    // Tính Δ theo công thức  
    const numerator = 4098 * 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
    const denominator = Math.pow((T + 237.3), 2);
    const delta = numerator / denominator;

    return delta; // Trả về giá trị Δ  (kPa °C-1)
}


function calculateETo(Ra, R_s, RH_hr, T_hr, u_2, Z) {
    // R_n: Bức xạ ròng (kJ/m² hoặc W/m²)  
    // G: Thông lượng nhiệt (kJ/m² hoặc W/m²)  
    // Delta: Hằng số Δ  
    // gamma: Hằng số tâm trắc học (kPa/°C)  
    // T_hr: Nhiệt độ không khí (°C)  
    // u_2: Tốc độ gió (m/s)  
    // e_a: Áp suất hơi thực tế (kPa)
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
    const numerator = 0.408 * Delta * (R_n - G) + (gamma * (37 / (T_hr + 273)) * u_2 * (e0 - e_a));
    const denominator = Delta + gamma * (1 + 0.34 * u_2);

    const ETo = numerator / denominator; // Giá trị ETo  


    return ETo < 0 ? Math.abs(ETo) : ETo; // Trả về ETo (mm/ngày)  
}

function WatToJun(ghi) {
    return ghi * 0.0864 / 24; //W/m^2 => MJ m-2
}

function calculateDailyETc(ETo, Kc) {
    try {
        if (ETo === null || Kc === null) {
            throw new Error("Không thể lấy ETo.");
        }
        // Tính chỉ số ETc
        const ETc = ETo * Kc;

        return ETc; // Trả về chỉ số ETc
    } catch (error) {
        console.error("Lỗi khi tính chỉ số ETc cho 1 giờ:", error);
        return null;
    }
};


function calculateCurrentWaterVolume(ETc, areaInSquareMeters) {
    try {
        // Lấy chỉ số ETc của ngày hiện tại


        // Kiểm tra xem chỉ số ETc có hợp lệ không
        if (ETc === null) {
            throw new Error("Không thể tính lượng nước vì chỉ số ETc không hợp lệ.");
        }

        // Tính lượng nước (lít) dựa trên diện tích và ETc
        const waterVolume = ETc * areaInSquareMeters; // 1 mm nước/m² tương đương 1 lít/m²

        return waterVolume; // Trả về lượng nước (lít)
    } catch (error) {
        console.error("Lỗi khi tính lượng nước hiện tại:", error);
        return null;
    }
};

const getSolar = async () => {
    let data = await firebaseStore.getWeatherToday();

    //If data = null, then will call a new api to get weather for today
    if (data == null) {
        console.log('Call new api weather ');
        await callApiWeather();
        data = await firebaseStore.getWeatherToday();
    }

    const solar = WatToJun(data.solar);
    console.log(solar);

    return solar;

}

const getDataFromSensor = async () => {
    const data = await firebaseStore.getDataFromSensorData();

    return data[0];
}

exports.handleWaterVolumeToday = async () => {
    let dataSensor = await getDataFromSensor();
    // Tính các tham số cần thiết
    const today = new Date(); // Ngày hiện tại

    time = dataSensor.currentTime;

    const hour = time.substring(0, time.indexOf(':'));

    // Các tham số tính bức xạ
    const phi = 10.094424 * (Math.PI / 180); // Vĩ độ (can tho 10 do) (Rad) //cứng 
    let t1 = hour - 0.5;

    //thay bằng giờ tưới 
    const Lm16 = 360 - 105.671879;  // Kinh độ ở phía tây Greenwich        //cứng 

    // Tính bức xạ ngoài Trái Đất
    const Ra = calculateSolarRadiation(phi, today, t1, Lm16);
    console.log(`Bức xạ ngoài trái đất R_a là ${Ra.toFixed(2)} MJ m-2 hour-1`);

    // Các tham số còn lại
    const R_s = await getSolar();
    let RH_hr = parseFloat(dataSensor.humidityInSideHouse);//độ ẩm trung bình sensor             //thay bằng độ ẩm trung bình 1 giờ sensor
    let T_hr = parseFloat(dataSensor.temp);//                                  //thay nhiệt dộ trung bình 1 giờ sensor
    const u_2 = 1;//cứng             
    const Z = 0;         //cứng

    // Tính ETo
    const ETo = calculateETo(Ra, R_s, RH_hr, T_hr, u_2, Z);
    console.log(`ETo là ${ETo} mm/hour`);


    const areaInSquareMeters = 500;         //cứng
    const ETc_kc05 = calculateDailyETc(ETo, 0.5);
    const ETc_kc085 = calculateDailyETc(ETo, 0.85);
    const ETc_kc06 = calculateDailyETc(ETo, 0.6);
    console.log(`ETc voi 0.5 là ${ETc_kc05} lít`);
    console.log(`ETc voi 0.85 là ${ETc_kc085} lít`);
    console.log(`ETc voi 0.6 là ${ETc_kc06} lít`);

    const currentVolumeWithKc05 = calculateCurrentWaterVolume(ETc_kc05, areaInSquareMeters);
    const currentVolumeWithKc085 = calculateCurrentWaterVolume(ETc_kc085, areaInSquareMeters);
    const currentVolumeWithKc06 = calculateCurrentWaterVolume(ETc_kc06, areaInSquareMeters);
    console.log(`Lượng nước với kc05 là ${currentVolumeWithKc05} lít`);
    console.log(`Lượng nước với kc085 là ${currentVolumeWithKc085} lít`);
    console.log(`Lượng nước với kc06 là ${currentVolumeWithKc06} lít`);

    await firebaseStore.addDataWaterVolume(dataSensor.humd, currentVolumeWithKc05, currentVolumeWithKc085, currentVolumeWithKc06, today.getTime());

}
