const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const authenticate = require('../middleware/auth');
const configureMulter = require('../config/multer');

// Configura Multer
const multerConfig = configureMulter(mongoose.connection);
const upload = multerConfig.upload;  // Modifica questa riga

// Rotta per creare un post e gestire l'upload del file
router.post('/', authenticate, async (req, res) => {
    try {
        // Gestione upload con Promise
        await new Promise((resolve, reject) => {
            upload.single('file')(req, res, (err) => {
                if (err) {
                    console.error('Errore durante upload:', err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });

        const { content } = req.body;

        if (!req.userId) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        const newPost = new Post({
            content,
            author: req.userId,
            files: req.file ? [req.file.id] : []
        });

        await newPost.save();

        res.status(201).json({
            message: 'Post creato con successo',
            post: newPost
        });
    } catch (error) {
        console.error('Errore creazione post:', error);
        
        if (req.file && req.file.id) {
            try {
                // Se hai bisogno di eliminare il file, usa gfs invece di storage
                const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
                    bucketName: 'uploads'
                });
                await gfs.delete(req.file.id);
                console.log(`File ${req.file.id} eliminato a causa di un errore.`);
            } catch (deleteError) {
                console.error(`Errore durante l'eliminazione del file ${req.file.id}:`, deleteError);
            }
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        } else {
            return res.status(500).json({ error: 'Errore interno del server' });
        }
    }
});

// Rotta per ottenere tutti i post
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find()
            .populate('author', 'username')
            .populate('files')
            .sort({ createdAt: -1 });

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
            .populate('author', 'username')
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