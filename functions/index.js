// Carica le variabili d'ambiente con percorso esplicito
require('dotenv').config({ path: __dirname + '/.env' });

// Debug - Verifica caricamento variabili
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Caricata' : 'Non caricata');
console.log('PORT:', process.env.PORT);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Caricata' : 'Non caricata');

// functions/index.js

// Importa le dipendenze necessarie
const functions = require('firebase-functions');
const express = require('express');

// Crea una nuova istanza di express
const app = express();

// Importa il server principale
const server = require('./server');

// Usa il server come middleware
// Questo permette di mantenere tutte le route e la logica in server.js
app.use('/', server);

// Configura le opzioni per la funzione
const runtimeOpts = {
    timeoutSeconds: 540, // 9 minuti
    memory: '1GB',
    minInstances: 0,
    maxInstances: 10
};

// Esporta la funzione con le opzioni configurate
exports.api = functions
    .runWith(runtimeOpts)
    .https.onRequest(app);