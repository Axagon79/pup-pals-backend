const admin = require('firebase-admin');

// Inizializza Firebase Admin SDK (se non l'hai già fatto)
// Assicurati di aver scaricato il file JSON della chiave dell'account di servizio
// e di averlo posizionato in un percorso sicuro (es. config/serviceAccountKey.json)
const serviceAccount = require('../config/serviceAccountKey.json'); // Percorso relativo al file JSON

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.userId = decodedToken.uid; // Aggiungi l'ID utente all'oggetto req
      next();
    } catch (error) {
      console.error('Errore verifica token:', error);
      return res.status(403).json({ error: 'Non autorizzato' });
    }
  } else {
    return res.status(401).json({ error: 'Token mancante' });
  }
};

module.exports = authenticate;