const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: { type: String, required: true },
  image: { type: String },
  video: { type: String },
  createdAt: { type: Date, default: Date.now },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dog: { type: mongoose.Schema.Types.ObjectId, ref: 'Dog' }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;