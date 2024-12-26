const User = require('../models/User');
const bcrypt = require('bcryptjs');

module.exports = {
  createUser: async (req, res) => {
    try {
      const { nome, email, password, Nikname } = req.body; // Aggiunto Nikname

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
        password: hashedPassword,
        Nikname // Aggiunto Nikname
      });

      await newUser.save();

      // Rimuovere la password dalla risposta e includere il Nikname
      const userResponse = {
        _id: newUser._id,
        nome: newUser.nome,
        email: newUser.email,
        Nikname: newUser.Nikname // Aggiunto Nikname
      };

      res.status(201).json(userResponse);
    } catch (err) {
      console.error("Errore durante la creazione dell'utente:", err);
      res.status(500).json({ message: "Errore durante la creazione dell'utente" });
    }
  },

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

      // Rimuovere la password dalla risposta e includere il Nikname
      const userResponse = {
        _id: user._id,
        nome: user.nome,
        email: user.email,
        Nikname: user.Nikname // Aggiunto Nikname
      };

      res.status(200).json(userResponse);
    } catch (err) {
      console.error("Errore durante il login:", err);
      res.status(500).json({ message: "Errore durante il login" });
    }
  }
};