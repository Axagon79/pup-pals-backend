// functions/index.js
const functions = require('firebase-functions');
const express = require('express');
const app = express();

// Importa il tuo server.js
const server = require('./server');

// Usa express come middleware
app.use('/', server);

// Esporta la funzione
exports.api = functions.https.onRequest(app);