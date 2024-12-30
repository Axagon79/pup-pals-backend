const mongoose = require('mongoose');

const MediaFileSchema = new mongoose.Schema({
  postId: { // ID del post (associato a Firestore o altro)
    type: String,
    required: true,
  },
  fileId: { // ID del file salvato in GridFS
    type: String,
    required: true,
  },
  filename: { // Nome del file
    type: String,
    required: true,
  },
  fileUrl: { // URL per accedere al file
    type: String,
    required: true,
  },
  fileType: { // Tipo di file (immagine o video)
    type: String,
    enum: ['image', 'video'],
    required: true,
  },
  uploadedAt: { // Data di caricamento
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('MediaFile', MediaFileSchema);