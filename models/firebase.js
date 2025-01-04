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

exports.addDataWaterVolume = async (humd, waterVolume05, waterVolume085, waterVolume06, millisecond) => {
    const date = new Date();
    const today = new Date(date.getTime());
    await addDoc(collection(firebaseStore.db, "waterVolume"), {
        humd,
        waterVolume: {
            "kc_05": waterVolume05,
            "kc_085": waterVolume085,
            "kc_06": waterVolume06
        },
        millisecond,
        timestamp: today.toDateString()
    });
}


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

exports.getDataFromWaterVolume = async () => {
    const date = new Date();
    const current = new Date(date.getTime());
    const sensorRef = collection(firebaseStore.db, "waterVolume");

    const q = query(sensorRef, where('timestamp', '==', current.toDateString()), orderBy('millisecond', 'desc'));
    let data = [];
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
        data.push(doc.data())
    })

    return data.reverse()
}


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
    // const q = query(collection(firebaseStore.db, "garden"), where("user", "==", userID.id));

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
        data.push(doc.data())
    });

    (data == null) ? data = null : data = data;

    return data;
}

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

