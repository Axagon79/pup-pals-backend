const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json'); // Percorso relativo diretto

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('Errore inizializzazione Firebase Admin:', error);
}

module.exports = admin;