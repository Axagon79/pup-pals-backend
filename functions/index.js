require('dotenv').config();
const functions = require('firebase-functions');
const server = require('./server');

exports.api = functions.https.onRequest(server);