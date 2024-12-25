const admin = require('../config/firebaseAdmin');

const authenticate = async (req, res, next) => {
  console.log('Headers ricevuti:', req.headers);
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.userId = decodedToken.uid;
      req.body.userId = decodedToken.uid;

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