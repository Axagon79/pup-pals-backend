const path = require('path');
const express = require('express');
const router = express.Router();
const { createUser, loginUser } = require('../controllers/userController');
const User = require('../models/User');

// I tuoi console.log originali
console.log('Percorso corrente:', process.cwd());
console.log('Percorso del file:', __dirname);
console.log('Contenuto della directory routes:', require('fs').readdirSync(__dirname));

console.log('Percorso middleware completo:', path.join(__dirname, '..', 'middleware'));

// Usa require con percorso assoluto
const authMiddleware = require(path.resolve(__dirname, '..', 'middleware', 'authMiddleware'));

console.log('createUser:', typeof createUser);
console.log('loginUser:', typeof loginUser);
console.log('authMiddleware:', typeof authMiddleware);

// GET tutti gli utenti
router.get('/', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // Esclude il campo password dalla risposta
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Registrazione nuovo utente
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Verifica se l'email esiste già
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email già registrata" });
        }

        // Crea nuovo utente
        const result = await createUser(req, res);
        return result;
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login utente
router.post('/login', async (req, res) => {
    try {
        const result = await loginUser(req, res);
        return result;
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Profilo utente (protetto)
router.get('/profile', authMiddleware, (req, res) => {
    res.json({
        message: 'Profilo utente',
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email
        }
    });
});

module.exports = router;