const express = require('express');
const router = express.Router();

router.post('/api/dogs/register', async (req, res) => {
  try {
    // Logica per registrare il cane nel database
    // Esempio:
    // const newDog = await Dog.create(req.body);
    res.status(201).json({ message: 'Cane registrato con successo', dog: newDog });
  } catch (error) {
    res.status(500).json({ message: 'Errore durante la registrazione del cane', error: error.message });
  }
});

module.exports = router;
