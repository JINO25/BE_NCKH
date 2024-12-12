const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const viewRouter = require('./routes/viewRoute');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const app = express();
dotenv.config({ path: './config.env' });
// require('./config/mqtt');
// require('./config/webSocket');
// require('./controllers/webSocketController');

if (process.env.ENV == 'development') {
    app.use(morgan('dev'));
} else {
    console.log('production');;
}
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5502'],
    credentials: true
}));

const scriptSrcUrls = [
    'https://unpkg.com/',
    'https://tile.openstreetmap.org',
    'https://cdnjs.cloudflare.com',
    'https://*.cloudflare.com',
    'https://cdnjs.cloudflare.com/ajax/libs/axios/0.18.0/axios.min.js'
];

const styleSrcUrls = [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'
];

const fontSrcUrls = [
    "'self'",
    'https://fonts.gstatic.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/webfonts/'
];

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'", 'http://127.0.0.1:5500/*', 'https://localhost:5500'],
            connectSrc: ["'self'",
                'http://127.0.0.1:5500',
                'http://localhost:5500',
                'ws://127.0.0.1:5500/',
                `ws://localhost:5500/`,
                'https://checkout.stripe.com',
                'https://api.stripe.com',
                'https://maps.googleapis.com'],
            scriptSrc: ["'self'", "'nonce-yourNonce'",
                "'sha256-ajGjo5eD0JzFPdnpuutKT6Sb5gLu+Q9ru594rwJogGQ='",
                "'unsafe-eval'",
                ...scriptSrcUrls],
            styleSrc: styleSrcUrls,
            fontSrc: fontSrcUrls,
            imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            workerSrc: ["'self'", 'blob:'],
            childSrc: ["'self'", 'blob:'],
            upgradeInsecureRequests: []
        }
    })
);

app.use('/api/view', viewRouter)

app.listen(3000, () => {
    console.log('App is running on port 3000!');

})