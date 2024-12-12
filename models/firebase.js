const firebaseStore = require('../config/config_firebase');
const { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, getDocs, getDoc, where, doc } = require('firebase/firestore');
const date = new Date();
const today = new Date(date.getTime());

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

exports.addData = async (currentTime, temp, humd) => {
    await addDoc(collection(firebaseStore.db, "sensor"), {
        temp,
        humd,
        currentTime,
        timestamp: today.toDateString()
    });
}


exports.listenToSensorData = (callback) => {
    const current = new Date();
    const sensorRef = collection(firebaseStore.db, "sensor");

    const q = query(sensorRef, where('timestamp', '==', current.toDateString()), orderBy('timestamp', 'desc'));

    onSnapshot(q, (querySnapshot) => {
        const sensorData = querySnapshot.docs.map(doc => doc.data()).reverse();
        // console.log('data', sensorData);

        callback(sensorData);
    });
}


exports.addDataForWeather7days = async (maxTemp, minTemp, icon, temp, date) => {
    const currentTime = new Date().getTime();

    await addDoc(collection(firebaseStore.db, "weather7days"), {
        maxTemp,
        minTemp,
        icon,
        temp,
        date,
        currentTime: currentTime,
        timestamp: today.toLocaleDateString()
    });
}


exports.addDataForWeatherToday = async (maxTemp, minTemp, temp, icon, humidity, solar, titleOfWeather) => {
    const currentTime = new Date().getTime();
    await addDoc(collection(firebaseStore.db, "weatherToday"), {
        maxTemp,
        minTemp,
        temp,
        icon,
        humidity,
        solar,
        titleOfWeather,
        currentTime: currentTime,
        timestamp: today.toLocaleDateString()
    });
}

exports.getWeatherToday = async () => {

    let data;

    const q = query(collection(firebaseStore.db, "weatherToday"), where('timestamp', '==', today.toLocaleDateString().toString()));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
        data = doc.data();
    });

    (data == null) ? data = null : data = data;

    return data;

}


exports.getWeather7days = async () => {

    let data;

    const q = query(collection(firebaseStore.db, "weather7days"), where('timestamp', '==', today.toLocaleDateString().toString()));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        data = doc.data();
    });

    (data == null) ? data = null : data = data;

    return data;

}
