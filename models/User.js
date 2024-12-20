const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.createUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Verifica se l'utente esiste già
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'Utente già esistente' 
      });
    }

    // Hash della password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crea nuovo utente
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ 
      message: 'Utente creato con successo', 
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Errore creazione utente:', error);
    res.status(500).json({ 
      message: 'Errore interno del server', 
      error: error.message 
    });
  }
};
