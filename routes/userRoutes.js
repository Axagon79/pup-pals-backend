const path = require('path');
const express = require('express');
const router = express.Router();
const { createUser, loginUser } = require('../controllers/userController');

console.log('Percorso corrente:', process.cwd());
console.log('Percorso del file:', __dirname);
console.log('Contenuto della directory:', require('fs').readdirSync(__dirname));
console.log('Contenuto middleware:', require('fs').readdirSync(path.join(__dirname, '..', 'middleware')));

const authMiddleware = require('../middleware/authMiddleware');

console.log('createUser:', typeof createUser);
console.log('loginUser:', typeof loginUser);
console.log('authMiddleware:', typeof authMiddleware);

router.post('/register', createUser);
router.post('/login', loginUser);

// Esempio di rotta protetta
router.get('/profile', authMiddleware, (req, res) => {
  res.json({
    message: 'Profilo utente',
    user: req.user
  });
});

module.exports = router;