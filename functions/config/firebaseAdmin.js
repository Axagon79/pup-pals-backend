const admin = require('firebase-admin');
const path = require('path');
// Modifica questa riga
const serviceAccount = require('./firebase-service-account.json');
// oppure usa il path assoluto
// const serviceAccount = require(path.join(__dirname, 'firebase-service-account.json'));

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