const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: String, required: true }, // Usa l'ID utente di Firebase (stringa)
  files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }], // Riferimento ai file
  createdAt: { type: Date, default: Date.now },
  dog: { type: mongoose.Schema.Types.ObjectId, ref: 'Dog' } // Lascio il riferimento a Dog (se serve)
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;