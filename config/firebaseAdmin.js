const admin = require('firebase-admin');

// Aggiungi queste due righe all'inizio del file:
const test = require('/etc/secrets/test.txt');
console.log("Contenuto di test.txt:", test);

// Il resto del tuo codice per l'inizializzazione di Firebase Admin SDK:
const serviceAccount = require('/etc/secrets/firebase-adminsdk.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('Errore inizializzazione Firebase Admin:', error);
}

module.exports = admin;