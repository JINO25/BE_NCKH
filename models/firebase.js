const firebaseStore = require('../config/config_firebase');
const { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, getDocs, getDoc, where, doc, updateDoc, deleteDoc } = require('firebase/firestore');
const date = new Date();

exports.addUser = async (name, email) => {
    const doc = await addDoc(collection(firebaseStore.db, 'user'), {
        name,
        email
    });
    return doc.id;
}

exports.findUser = async (email) => {
    const q = query(collection(firebaseStore.db, 'user'), where("email", "==", email));
    const data = await getDocs(q);

    if (!data.empty) {
        const userDoc = data.docs[0];
        const user = {
            id: userDoc.id,
            email: userDoc.data().email,
            name: userDoc.data().name
        };
        return user;
    } else {
        return null;
    }
}

exports.findUserByID = async (id) => {
    const data = doc(firebaseStore.db, 'user', id);
    const docSnap = await getDoc(data);

    if (docSnap.exists()) {
        return docSnap.data()
    } else {
        return null;
    }
}

exports.addData = async (currentTime, millisecond, temp, humd, humidityInSideHouse) => {
    const date = new Date();
    const today = new Date(date.getTime());
    console.log('today in firebase: ', today);

    await addDoc(collection(firebaseStore.db, "sensor"), {
        temp,
        humd,
        humidityInSideHouse,
        currentTime,
        millisecond,
        timestamp: today.toDateString()
    });
}

// hàm thứ 1
// exports.addDataWaterVolume = async (humd, waterVolume05, waterVolume085, waterVolume06, millisecond) => {
//     const date = new Date();
//     const today = new Date(date.getTime());
//     await addDoc(collection(firebaseStore.db, "waterVolume"), {
//         humd,
//         waterVolume: {
//             "kc_05": waterVolume05,
//             "kc_085": waterVolume085,
//             "kc_06": waterVolume06
//         },
//         millisecond,
//         timestamp: today.toDateString()
//     });
// }

// hàm thứ 2
exports.addDataWaterVolume = async (humd, waterVolume05, waterVolume085, waterVolume06, millisecond, extras = {}) => {
    const today = new Date();
    await addDoc(collection(firebaseStore.db, "waterVolume"), {
        humd,
        waterVolume: {
            "kc_05": waterVolume05,
            "kc_085": waterVolume085,
            "kc_06": waterVolume06
        },
        ETo: extras.ETo ?? null,
        millisecond,
        timestamp: today.toDateString()
    });
};


exports.listenToSensorData = (callback) => {
    const date = new Date();
    const current = new Date(date.getTime());

    const sensorRef = collection(firebaseStore.db, "waterVolume");

    const q = query(sensorRef, where('timestamp', '==', current.toDateString()), orderBy('millisecond', 'desc'));

    onSnapshot(q, (querySnapshot) => {
        const sensorData = querySnapshot.docs.map(doc => doc.data()).reverse();
        // console.log('data', sensorData);

        callback(sensorData);
    });
}

exports.getDataFromSensorData = async () => {
    const date = new Date();
    const current = new Date(date.getTime());
    console.log('current time in firebase: ', current);

    const sensorRef = collection(firebaseStore.db, "sensor");

    const q = query(sensorRef, where('timestamp', '==', current.toDateString()), orderBy('millisecond', 'desc'));
    let data = [];
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
        data.push(doc.data())
    })

    return data;
}


exports.getWaterDataFromYesterday = async () => {
    const y = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    const waterVolumeRef = collection(firebaseStore.db, "waterVolume");
    const q = query(waterVolumeRef, where('timestamp', '==', y), orderBy('millisecond', 'desc'));
    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach(doc => data.push(doc.data()));
    return data.reverse();
};


exports.getDataFromWaterVolume = async () => {
    const today = new Date().toDateString();
    const waterVolumeRef = collection(firebaseStore.db, "waterVolume");
    const q = query(waterVolumeRef, where('timestamp', '==', today), orderBy('millisecond', 'desc'));
    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach(doc => data.push(doc.data()));
    return data.reverse();
};



exports.addDataForWeather7days = async (maxTemp, minTemp, icon, temp, date) => {
    const day = new Date();
    const today = new Date(day.getTime());

    const current = new Date(day.getTime());
    console.log(current);


    await addDoc(collection(firebaseStore.db, "weather7days"), {
        maxTemp,
        minTemp,
        icon,
        temp,
        date,
        currentTime: current.getTime(),
        timestamp: today.toLocaleDateString()
    });
}


exports.addDataForWeatherToday = async (maxTemp, minTemp, temp, icon, humidity, solar, titleOfWeather) => {

    const day = new Date();
    const today = new Date(day.getTime());

    const current = new Date(day.getTime());
    console.log(current);

    await addDoc(collection(firebaseStore.db, "weatherToday"), {
        maxTemp,
        minTemp,
        temp,
        icon,
        humidity,
        solar,
        titleOfWeather,
        currentTime: current.getTime(),
        timestamp: today.toLocaleDateString()
    });

}

exports.getWeatherToday = async () => {
    const date = new Date();
    const today = new Date(date.getTime());
    let data;

    const q = query(collection(firebaseStore.db, "weatherToday"), where('timestamp', '==', today.toLocaleDateString().toString()), orderBy("currentTime", "desc"), limit(1));

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
        data = doc.data();
    });

    (data == null) ? data = null : data = data;


    return data;

}


exports.getWeather7days = async () => {

    let data;
    const date = new Date();
    const today = new Date(date.getTime());

    const q = query(collection(firebaseStore.db, "weather7days"), where('timestamp', '==', today.toLocaleDateString().toString()), orderBy("currentTime", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        data = doc.data();
    });

    (data == null) ? data = null : data = data;

    return data;

}

exports.addGarden = async (user, nameGarden, typeGarden, method, area, note, latitude, longitude) => {

    const userID = await this.findUser(user.email)

    if (!note) {
        await addDoc(collection(firebaseStore.db, 'garden'), {
            user: userID.id,
            nameGarden,
            typeGarden,
            method,
            area,
            latitude,
            longitude,
            timestamp: serverTimestamp()
        })
    } else {
        await addDoc(collection(firebaseStore.db, 'garden'), {
            user: userID.id,
            nameGarden,
            typeGarden,
            method,
            area,
            note,
            latitude,
            longitude,
            timestamp: serverTimestamp()
        })
    }
}

exports.getAllGardens = async (user) => {
    const userID = await this.findUser(user.email)
    let data = [];
    const q = query(collection(firebaseStore.db, "garden"), where("user", "==", userID.id), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() });
    });


    (data == null) ? data = null : data = data;

    return data;
}


exports.getGardenById = async (user, id) => {
    const ref = doc(firebaseStore.db, 'garden', id);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
};

exports.getAllGardenByName = async (user, name) => {
    const userID = await this.findUser(user.email)
    let data = [];

    const q = query(collection(firebaseStore.db, "garden"), where("user", "==", userID.id), where("nameGarden", "==", name));

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
        console.log(doc.id);

        data.push(doc.data())
    });

    (data == null) ? data = null : data = data;

    return data;
}

exports.updateGarden = async (user, name, updates) => {
    const userID = await this.findUser(user.email)

    // console.log(updates);

    try {
        const nullKeys = [];
        for (let key in updates) {
            if (updates[key] == null || updates[key] == undefined || !updates[key]) {
                nullKeys.push(key);
            }
        }

        for (let key in nullKeys) {
            delete updates[nullKeys[key]];
        }


        const q = query(collection(firebaseStore.db, "garden"), where("user", "==", userID.id), where("nameGarden", "==", name));
        const querySnapshot = await getDocs(q);
        let gardenID;

        querySnapshot.forEach((doc) => {
            gardenID = doc.id
        });

        await updateDoc(doc(firebaseStore.db, 'garden', gardenID), {
            ...updates
        })

        return true;

    } catch (error) {
        console.log(error);
        return false;
    }
}


exports.deleteGarden = async (user, nameGarden) => {
    const userID = await this.findUser(user.email)

    try {
        const q = query(collection(firebaseStore.db, "garden"), where("user", "==", userID.id), where("nameGarden", "==", nameGarden));
        const querySnapshot = await getDocs(q);
        let gardenID;

        querySnapshot.forEach((doc) => {
            gardenID = doc.id
        });

        await deleteDoc(doc(firebaseStore.db, 'garden', gardenID));
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

exports.seedWaterVolumeForToday = async () => {
    const now = new Date();
    const dayStr = now.toDateString(); 
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0, 0); // 7:00 AM

    // 10 mốc giờ 7:00 -> 16:00
    const kc05 = [0.2, 0, 0.2, 0.2, 0.4, 0.4, 0.2, 0.2, 0.2, 0.2];
    const kc085 = [0.35, 0, 0.35, 0.35, 0.6, 0.6, 0.35, 0.35, 0.35, 0.35];
    const kc06 = [0.25, 0, 0.25, 0.25, 0.45, 0.45, 0.25, 0.25, 0.25, 0.25];
    const humd = [62, 63, 64, 63, 66, 68, 65, 64, 63, 62];

    for (let i = 0; i < 10; i++) {
        await addDoc(collection(firebaseStore.db, "waterVolume"), {
        humd: humd[i],
        waterVolume: { kc_05: kc05[i], kc_085: kc085[i], kc_06: kc06[i] }, // ETc (mm/h)
        millisecond: base.getTime() + i * 60 * 60 * 1000,
        timestamp: dayStr
        });
    }
};

// ========== CROP TYPE ==========

async function resolveUserId(user) {
    try {
    if (user && user.email) {
        const u = await module.exports.findUser(user.email);
        return u?.id || null;
    }
    } catch (e) {
        console.error('resolveUserId error:', e);
    }
    return null;
}

exports.addCropType = async (user, payload) => {
    const userID = await this.findUser(user.email);
    const docRef = await addDoc(collection(firebaseStore.db, 'cropType'), {
        ...payload,
        user: userID.id,
        timestamp: serverTimestamp()
    });
    return docRef.id;
};

exports.getCropTypes = async (user) => {
    const userID = await this.findUser(user.email);
    const qBase = query(collection(firebaseStore.db, 'cropType'), where('user', '==', userID.id), orderBy('timestamp', 'desc'));
    const snap = await getDocs(qBase);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

exports.getCropById = async (user, id) => {
    const ref = doc(firebaseStore.db, 'cropType', id);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
};

exports.updateCropType = async (user, id, updates) => {
    await updateDoc(doc(firebaseStore.db, 'cropType', id), { ...updates });
    return true;
};

exports.deleteCropType = async (user, id) => {
    await deleteDoc(doc(firebaseStore.db, 'cropType', id));
    return true;
};

// ========== SEASON ==========
exports.addSeason = async (user, payload) => {
    const userID = await resolveUserId(user);
    // payload: { gardenId, cropId, startDate, endDate? }
    let endDate = payload.endDate;
    if (!endDate) {
        const crop = await this.getCropById(user, payload.cropId);
        const totalDays = (crop?.daysInit || 0) + (crop?.daysDev || 0) + (crop?.daysMid || 0) + (crop?.daysLate || 0);
        endDate = payload.startDate + totalDays * 24 * 60 * 60 * 1000;
    }
    const docRef = await addDoc(collection(firebaseStore.db, 'season'), {
        ...payload,
        endDate,
        user: userID,
        status: 'active',
        timestamp: serverTimestamp()
    });
    return docRef.id;
};

exports.getSeasons = async (user, gardenId) => {
    const userID = await resolveUserId(user);
    const colRef = collection(firebaseStore.db, 'season');
    let qBase;
    if (userID && gardenId) {
        qBase = query(colRef, where('user', '==', userID), where('gardenId', '==', gardenId), orderBy('timestamp', 'desc'));
    } else if (userID) {
        qBase = query(colRef, where('user', '==', userID), orderBy('timestamp', 'desc'));
    } else if (gardenId) {
        qBase = query(colRef, where('gardenId', '==', gardenId), orderBy('timestamp', 'desc'));
    } else {
        qBase = query(colRef, orderBy('timestamp', 'desc'));
    }
    const snap = await getDocs(qBase);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

exports.getActiveSeasons = async (user) => {
    const userID = await resolveUserId(user);
    const now = Date.now();
    const colRef = collection(firebaseStore.db, 'season');
    let qBase;
    if (userID) {
        qBase = query(colRef, where('user', '==', userID));
    } else {
        qBase = query(colRef);
    }
    const snap = await getDocs(qBase);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(s => now >= s.startDate && now <= s.endDate);
};

exports.updateSeason = async (user, id, updates) => {
    await updateDoc(doc(firebaseStore.db, 'season', id), { ...updates });
    return true;
};

exports.deleteSeason = async (user, id) => {
    await deleteDoc(doc(firebaseStore.db, 'season', id));
    return true;
};

// ========== SENSOR META ==========
exports.addSensorMeta = async (user, payload) => {
    const userID = await this.findUser(user.email);
    const data = {
        name: payload.name,
        topic: payload.topic || 'Sensor_data',
        type: payload.type || 'DHT',
        gardenId: payload.gardenId || null, // null = chưa gắn
        status: payload.gardenId ? 'online' : 'offline',
        user: userID.id,
        timestamp: serverTimestamp()
    };
    const docRef = await addDoc(collection(firebaseStore.db, 'sensorMeta'), data);
    return docRef.id;
};

exports.getSensorsMeta = async (user, gardenId) => {
    const userID = await this.findUser(user.email);
    const colRef = collection(firebaseStore.db, 'sensorMeta');
    let qBase;
    if (gardenId) {
        qBase = query(colRef,
            where('user', '==', userID.id),
            where('gardenId', '==', gardenId),
            orderBy('timestamp', 'desc')
        );
    } else {
        qBase = query(colRef,
            where('user', '==', userID.id),
            orderBy('timestamp', 'desc')
        );
    }
    const snap = await getDocs(qBase);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

exports.updateSensorMeta = async (user, id, updates) => {
    const ref = doc(firebaseStore.db, 'sensorMeta', id);
    const toUpdate = { ...updates };
    // Auto status theo gardenId
    if ('gardenId' in updates) {
        if (updates.gardenId) {
            toUpdate.gardenId = updates.gardenId;
            toUpdate.status = 'online';
        } else {
            toUpdate.gardenId = null;
            toUpdate.status = 'offline';
        }
    }
    await updateDoc(ref, toUpdate);
    return true;
};

exports.deleteSensorMeta = async (user, id) => {
    await deleteDoc(doc(firebaseStore.db, 'sensorMeta', id));
    return true;
};