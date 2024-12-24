// Versione aggiornata senza opzioni deprecate
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ Connessione MongoDB Atlas riuscita');
  mongoose.connection.close();
})
.catch(err => {
  console.error('❌ Errore connessione:', err);
});