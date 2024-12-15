require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Importa le routes
const userRoutes = require('./routes/userRoutes');
const dogRoutes = require('./routes/dogRoutes');

// Usa le routes
app.use('/api/users', userRoutes);
app.use('/api/dogs', dogRoutes);

const MONGODB_URI = process.env.MONGODB_URI;

// Connessione MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connesso a MongoDB'))
  .catch(err => console.error('Errore di connessione a MongoDB:', err));

// Avvio del server
app.listen(port, () => {
  console.log(`Server in esecuzione sulla porta ${port}`);
});
