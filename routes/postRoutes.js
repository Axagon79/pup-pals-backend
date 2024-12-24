const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Importa mongoose se usi storage.delete
const Post = require('../models/Post');
const authenticate = require('../middlewares/auth');
const { upload, storage } = require('../config/multerConfig'); // Importa upload e storage

// Rotta per creare un post e gestire l'upload del file
router.post('/', authenticate, upload, async (req, res) => {
  try {
    const { content } = req.body; // Prendi solo 'content' dal body

    // Usa req.userId (proveniente dal middleware di autenticazione) per l'autorizzazione
    if (!req.userId) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    // Crea un nuovo post
    const newPost = new Post({
      content,
      author: req.userId, // Usa req.userId come autore
      files: req.file ? [req.file.id] : [] // Aggiungi l'ID del file se presente
    });

    await newPost.save();

    res.status(201).json({
      message: 'Post creato con successo',
      post: newPost
    });
  } catch (error) {
    console.error('Errore creazione post:', error);
    if (req.file) {
      // Se c'è stato un errore, elimina il file caricato
      try {
        await storage.delete(req.file.id);
        console.log(`File ${req.file.id} eliminato a causa di un errore.`);
      } catch (deleteError) {
        console.error(`Errore durante l'eliminazione del file ${req.file.id}:`, deleteError);
      }
    }

    // Gestione errori più specifica
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Errore interno del server' });
    }
  }
});

// Rotta per ottenere tutti i post (esempio)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username') // Popola l'autore con i campi desiderati (es. username)
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
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username') // Popola l'autore con i campi desiderati (es. username)
      .populate('files');

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