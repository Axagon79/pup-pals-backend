const path = require('path');
const serviceAccount = require('./config/firebase-adminsdk.json');

const admin = require('firebase-admin');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('Errore inizializzazione Firebase Admin:', error);
}

module.exports = admin;