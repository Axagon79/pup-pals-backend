const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'config', 'firebase-service-account.json'));

// Mantieni questo console.log per verificare il contenuto di serviceAccount
console.log("Contenuto di serviceAccount:", serviceAccount);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('Errore inizializzazione Firebase Admin:', error);
}

module.exports = admin;