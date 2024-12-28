const admin = require('firebase-admin');
const fs = require('fs'); // Importa il modulo fs

// Leggi il contenuto di test.txt usando fs.readFileSync:
const test = fs.readFileSync('/etc/secrets/test.txt', 'utf8');
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