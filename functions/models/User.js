const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  Nikname: { type: String }, // Aggiunto il campo Nikname
  dogs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dog' }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;