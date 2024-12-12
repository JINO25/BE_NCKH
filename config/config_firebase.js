
const { initializeApp } = require('firebase/app')
const { getFirestore } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const firebaseConfig = {
    apiKey: process.env.apiKey,
    authDomain: process.env.authDomain,
    projectId: process.env.projectId,
    storageBucket: process.env.storageBucket,
    messagingSenderId: process.env.messagingSenderId,
    appId: process.env.appId,
    measurementId: process.env.measurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app)

module.exports = { db, auth };
