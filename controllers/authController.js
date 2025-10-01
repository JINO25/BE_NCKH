const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { auth } = require('../config/config_firebase');
const catchAsync = require('../middlewares/catchAsync');
const jwt = require('jsonwebtoken');
const { addUser, findUser, findUserByID } = require('../models/firebase');

const isProd = process.env.ENV === 'production';

const generateToken = id =>
  jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRIES || '10d'
  });

const sendToken = (user, statusCode, res) => {
  const token = generateToken(user.id);

  const cookieOption = {
    httpOnly: true,
    secure: isProd,                 
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 10 * 24 * 60 * 60 * 1000 // 10 ngày
  };

  res.cookie('jwtCookie', token, cookieOption);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

exports.isLogin = async (req, res, next) => {
  if (req.cookies.jwtCookie) {
    try {
      const decoded = await jwt.verify(req.cookies.jwtCookie, process.env.JWT_SECRET_KEY);
      const currentUser = await findUserByID(decoded.id);
      if (!currentUser) return next();
      res.locals.user = currentUser;
      req.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: 'fail', message: 'Vui lòng đăng nhập' });
  }
  next();
};

exports.logout = (req, res) => {
  res.cookie('jwtCookie', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    expires: new Date(0)
  });
  res.status(200).json({ status: 'success' });
};

exports.login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ status: 'fail', message: 'Please provide email and password!' });

    signInWithEmailAndPassword(auth, email, password)
        .then(async () => {
        const user = await findUser(email);
        if (!user) return res.status(401).json({ status: 'fail', message: 'User not found in DB' });
        sendToken(user, 200, res);
        })
        .catch(() => res.status(401).json({ status: 'fail', message: 'Invalid email or password' }));
});

exports.signup = catchAsync(async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ status: 'fail', message: 'Please provide name, email, password' });
    }
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        const id = await addUser(name, email); 
        const user = { id, name, email };      
        sendToken(user, 201, res);
    } catch (error) {
        res.status(400).json({ status: 'fail', message: error.message });
    }
});

exports.me = (req, res) => {
    if (!req.user) return res.status(401).json({ status: 'fail', message: 'Chưa đăng nhập' });
    res.status(200).json({ status: 'success', data: req.user });
};