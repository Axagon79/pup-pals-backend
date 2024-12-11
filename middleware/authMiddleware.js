const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Prendi il token dall'header Authorization
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      message: 'Nessun token, autorizzazione negata'
    });
  }
  
  try {
    // Verifica il token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Aggiungi l'utente decodificato alla richiesta
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      message: 'Token non valido'
    });
  }
};

module.exports = authMiddleware;