const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const createUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validazione input
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username e password sono richiesti' 
      });
    }

    // Verifica se l'utente esiste già
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Username già esistente' 
      });
    }

    // Hash della password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crea nuovo utente
    const newUser = new User({
      username,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ 
      message: 'Utente registrato con successo',
      user: { 
        id: newUser._id, 
        username: newUser.username 
      }
    });
  } catch (error) {
    console.error('Errore durante la registrazione:', error);
    res.status(500).json({ 
      message: 'Errore durante la registrazione',
      error: error.message 
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Trova l'utente
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ 
        message: 'Credenziali non valide' 
      });
    }

    // Verifica password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        message: 'Credenziali non valide' 
      });
    }

    // Genera token JWT
    const token = jwt.sign(
      { id: user._id, username: user.username }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.status(200).json({ 
      message: 'Login effettuato con successo',
      token,
      user: { 
        id: user._id, 
        username: user.username 
      }
    });
  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ 
      message: 'Errore durante il login',
      error: error.message 
    });
  }
};

module.exports = {
  createUser,
  loginUser
};