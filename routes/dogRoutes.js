const express = require('express');
const router = express.Router();

// Cambia '/api/dogs/register' in '/register'
router.post('/register', async (req, res) => {
  try {
    // Logica per registrare il cane nel database
    // Esempio:
    // const newDog = await Dog.create(req.body);
    
    // Per ora, simuliamo la creazione di un nuovo cane
    const newDog = {
      id: Math.random().toString(36).substr(2, 9),
      ...req.body
    };
    
    res.status(201).json({ message: 'Cane registrato con successo', dog: newDog });
  } catch (error) {
    res.status(500).json({ message: 'Errore durante la registrazione del cane', error: error.message });
  }
});

module.exports = router;
