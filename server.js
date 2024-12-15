require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5000;

const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

console.log('MONGODB_URI:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connesso a MongoDB'))
  .catch(err => console.error('Errore di connessione a MongoDB:', err));

// Importa le rotte
const userRoutes = require('./routes/userRoutes');
const dogRoutes = require('./routes/dogRoutes');

// Aggiungi il prefisso /api a userRoutes
app.use('/api/users', userRoutes);
app.use('/api/dogs', dogRoutes);

// Avvio del server
app.listen(port, () => {
  console.log(`Server in esecuzione sulla porta ${port}`);
});
