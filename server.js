require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5000;

const MONGODB_URI = process.env.MONGODB_URI; // Rimuovi la parte "|| 'mongodb://127.0.0.1:27017/pup-pals'"

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Aggiungi il console.log qui:
console.log('MONGODB_URI:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connesso a MongoDB'))
  .catch(err => console.error('Errore di connessione a MongoDB:', err));

// Importa le rotte
const userRoutes = require('./routes/userRoutes');
const dogRoutes = require('./routes/dogRoutes'); // Nuova linea

console.log('Tipo di userRoutes:', typeof userRoutes);
console.log('Chiavi di userRoutes:', Object.keys(userRoutes));

app.use('/users', userRoutes);
app.use('/api/dogs', dogRoutes); // Nuova linea

// Avvio del server
app.listen(port, () => {
  console.log(`Server in esecuzione sulla porta ${port}`);
});
