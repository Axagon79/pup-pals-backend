const admin = require('./firebase-admin'); // Importa l'istanza di Firestore Admin
const { db } = admin;
const User = require('../models/User');
const bcrypt = require('bcryptjs');

module.exports = {
  createUser: async (req, res) => {
    try {
      const { nome, email, password, nickname } = req.body;

      // Controllo se l'utente esiste già
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Utente già registrato' });
      }

      // Hash della password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Creazione nuovo utente in MongoDB (senza nickname)
      const newUser = new User({
        nome,
        email,
        password: hashedPassword
      });

      await newUser.save();

      // Salva il nickname in Firestore
      try {
        const firestoreUserRef = db.collection('users').doc(newUser._id.toString());
        await firestoreUserRef.set({ nickname: nickname });
        console.log('Nickname salvato in Firestore per l\'utente:', newUser._id);
      } catch (firestoreError) {
        console.error('Errore durante il salvataggio del nickname in Firestore:', firestoreError);

        // Gestisci l'errore: elimina l'utente da MongoDB se il salvataggio in Firestore fallisce
        try {
          await User.deleteOne({ _id: newUser._id });
          console.warn('Utente eliminato da MongoDB a causa di un errore in Firestore.');
        } catch (deleteError) {
          console.error('Errore durante l\'eliminazione dell\'utente da MongoDB:', deleteError);
        }

        return res.status(500).json({ error: 'Errore durante la creazione dell\'utente in Firestore.' });
      }

      // Rimuovere la password dalla risposta e includere il nickname da Firestore
      const userResponse = {
        _id: newUser._id,
        nome: newUser.nome,
        email: newUser.email,
        nickname: nickname
      };

      res.status(201).json(userResponse);

    } catch (err) {
      console.error("Errore durante la creazione dell'utente in MongoDB:", err);
      res.status(500).json({ message: "Errore durante la creazione dell'utente in MongoDB" });
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

      // Recupera il nickname da Firestore
      try {
        const firestoreUserRef = db.collection('users').doc(user._id.toString());
        const firestoreUserDoc = await firestoreUserRef.get();
        let nickname = 'Utente sconosciuto'; // Valore di default se il nickname non è presente in Firestore

        if (firestoreUserDoc.exists) {
          nickname = firestoreUserDoc.data().nickname;
        }

        // Rimuovere la password dalla risposta e includere il nickname da Firestore
        const userResponse = {
          _id: user._id,
          nome: user.nome,
          email: user.email,
          nickname: nickname
        };

        res.status(200).json(userResponse);

      } catch (firestoreError) {
        console.error('Errore durante il recupero del nickname da Firestore:', firestoreError);
        return res.status(500).json({ message: "Errore durante il recupero del nickname" });
      }
    } catch (err) {
      console.error("Errore durante il login:", err);
      res.status(500).json({ message: "Errore durante il login" });
    }
  }
};