const express = require('express');
const router = express.Router();
const Post = require('../models/Post'); // Importa il modello Post

// Middleware per verificare l'autenticazione (da implementare)
const authenticate = require('../middlewares/auth'); // Assicurati di avere un middleware di autenticazione
const multerConfig = configureMulter(mongoose.connection);
const upload = multerConfig.upload.single('file');

router.post('/upload', (req, res) => {
  upload(req, res, function(err) {
    if (err) {
      console.error('Errore upload:', err);
      return res.status(400).json({ error: err.message });
    }
    // Gestisci il successo
    res.json({ file: req.file });
  });
});
    


// Rotta per creare un nuovo post
router.post('/', authenticate, async (req, res) => {
  try {
    const { content, userId } = req.body; 

    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const newPost = new Post({
      content,
      author: userId, // Usa direttamente userId (Firebase ID)
      files: [] // Inizialmente vuoto
    });

    await newPost.save();

    res.status(201).json({
      message: 'Post creato con successo',
      post: newPost
    });
  } catch (error) {
    console.error('Errore creazione post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rotta per ottenere tutti i post (esempio)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('files') // Popola i file
      .sort({ createdAt: -1 }); // Ordina per data di creazione decrescente

    res.json(posts);
  } catch (error) {
    console.error('Errore recupero post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rotta per ottenere un singolo post con i suoi file
router.get('/:postId', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate('files');

    if (!post) {
      return res.status(404).json({ message: 'Post non trovato' });
    }

    res.json(post);
  } catch (error) {
    console.error('Errore recupero post:', error);
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;