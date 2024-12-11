const User = require('../models/User');
const bcrypt = require('bcryptjs');

module.exports = {
  createUser: async (req, res) => {
    try {
      const { nome, email, password } = req.body;
      
      // Controllo se l'utente esiste già
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Utente già registrato' });
      }

      // Hash della password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Creazione nuovo utente
      const newUser = new User({ 
        nome, 
        email, 
        password: hashedPassword 
      });

      await newUser.save();

      // Rimuovere la password dalla risposta
      const userResponse = {
        _id: newUser._id,
        nome: newUser.nome,
        email: newUser.email
      };

      res.status(201).json(userResponse);
    } catch (err) {
      console.error("Errore durante la creazione dell'utente:", err);
      res.status(500).json({ message: "Errore durante la creazione dell'utente" });
    }
  },

  // Aggiungiamo un metodo di login
  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Trovare l'utente
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Credenziali non valide' });
      }

      // Verificare la password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Credenziali non valide' });
      }

      // Rimuovere la password dalla risposta
      const userResponse = {
        _id: user._id,
        nome: user.nome,
        email: user.email
      };

      res.status(200).json(userResponse);
    } catch (err) {
      console.error("Errore durante il login:", err);
      res.status(500).json({ message: "Errore durante il login" });
    }
  }
};