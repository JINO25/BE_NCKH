const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const express = require('express');
const router = express.Router();

router.get('/home', authController.isLogin, viewController.getHome);
router.get('/weatherToday', viewController.getDataWeatherToday);
router.get('/weather7days', viewController.getDataWeather7Days);
router.post('/callApiWeather', viewController.callApiWeather);

router.post('/weatherToday', viewController.addDataWeatherToday);
router.post('/weather7days', viewController.addDataForWeather7days);

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.get('/logout', authController.logout);

router.get('/gardens', authController.isLogin, viewController.getAllGardenInfo)
router.get('/garden/:name', authController.isLogin, viewController.getAllGardenInfoByName)

router.post('/garden', authController.isLogin, viewController.addGardenInfo)
router.patch('/garden/:name', authController.isLogin, viewController.updateGardenInfo)
router.delete('/garden', authController.isLogin, viewController.deleteGardenInfo)


module.exports = router;