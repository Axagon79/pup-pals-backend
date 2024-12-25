// middleware/corsMiddleware.js
const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://pup-pals.vercel.app',
      'http://localhost:3000'
    ];

    console.log('Origine richiesta:', origin);

    if (!origin || allowedOrigins.includes(origin)) {
      console.log('Origine consentita');
      callback(null, true);
    } else {
      console.log('Origine NON consentita');
      callback(new Error('Origine non autorizzata dal CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;