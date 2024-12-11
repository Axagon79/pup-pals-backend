const mongoose = require('mongoose');

const dogSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  age: { 
    type: Number, 
    required: true 
  },
  breed: { 
    type: String, 
    required: true 
  },
  size: { 
    type: String, 
    required: true 
  },
  sex: {
    type: String,
    enum: ['maschio', 'femmina'],
    required: true
  },
  image: { 
    type: String 
  },
  about: { 
    type: String 
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  medicalHistory: [{
    date: Date,
    description: String,
    type: String // es. vaccino, visita, trattamento
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware per aggiornare updatedAt
dogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Dog = mongoose.model('Dog', dogSchema);

module.exports = Dog;