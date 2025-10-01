const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const express = require('express');
const router = express.Router();

const cropController = require('../controllers/cropController');
const seasonController = require('../controllers/seasonController');
const sensorController = require('../controllers/sensorController');

router.get('/home', authController.isLogin, authController.requireAuth, viewController.getHome);
router.get('/weatherToday', viewController.getDataWeatherToday);
router.get('/weather7days', viewController.getDataWeather7Days);
router.post('/callApiWeather', viewController.callApiWeather);

router.post('/weatherToday', viewController.addDataWeatherToday);
router.post('/weather7days', viewController.addDataForWeather7days);

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.get('/logout', authController.logout);

router.get('/gardens', authController.isLogin, authController.requireAuth, viewController.getAllGardenInfo);
router.get('/garden/:name', authController.isLogin, viewController.getAllGardenInfoByName)
router.get('/gardenById/:id', authController.isLogin, authController.requireAuth, viewController.getGardenById);



router.post('/garden', authController.isLogin, viewController.addGardenInfo)
router.patch('/garden/:name', authController.isLogin, viewController.updateGardenInfo)
router.delete('/garden', authController.isLogin, viewController.deleteGardenInfo)

router.post('/seedWaterVolume', viewController.seedWaterVolume);



router.get('/me', authController.isLogin, authController.me);
router.get('/dashboard-gardens', authController.isLogin, authController.requireAuth, viewController.getDashboardGardens);

router.get('/crops', authController.isLogin, authController.requireAuth, cropController.list);
router.post('/crops', authController.isLogin, authController.requireAuth, cropController.create);
router.patch('/crops/:id', authController.isLogin, authController.requireAuth, cropController.update);
router.delete('/crops/:id', authController.isLogin, authController.requireAuth, cropController.remove);

router.get('/seasons', authController.isLogin, authController.requireAuth, seasonController.list);
router.post('/seasons', authController.isLogin, authController.requireAuth, seasonController.create);
router.patch('/seasons/:id', authController.isLogin, authController.requireAuth, seasonController.update);
router.delete('/seasons/:id', authController.isLogin, authController.requireAuth, seasonController.remove);

router.get('/sensors-meta', authController.isLogin, authController.requireAuth, sensorController.list);
router.post('/sensors-meta', authController.isLogin, authController.requireAuth, sensorController.create);
router.patch('/sensors-meta/:id', authController.isLogin, authController.requireAuth, sensorController.update);
router.delete('/sensors-meta/:id', authController.isLogin, authController.requireAuth, sensorController.remove);
// 
module.exports = router;