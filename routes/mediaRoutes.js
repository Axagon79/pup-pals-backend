// routes/mediaRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/gridfsUpload'); // Il file che hai mostrato
const mongoose = require('mongoose');

// Schema per i metadati dei file
const MediaFile = new mongoose.Schema({
    filename: String,
    originalName: String,
    fileId: mongoose.Schema.Types.ObjectId,
    mimetype: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now },
    postId: String
});

const File = mongoose.model('MediaFile', MediaFile);

let gfs;
mongoose.connection.once('open', () => {
    gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads'
    });
});

// Rotta per l'upload
router.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }

        const fileDoc = new File({
            filename: req.file.filename,
            originalName: req.file.originalname,
            fileId: req.file.id,
            mimetype: req.file.mimetype,
            size: req.file.size,
            postId: req.body.postId
        });

        await fileDoc.save();

        res.status(201).json({
            success: true,
            file: {
                id: fileDoc._id,
                filename: fileDoc.filename,
                url: `/api/media/files/${fileDoc.filename}`
            }
        });
    } catch (error) {
        console.error('Errore upload:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rotta per scaricare/visualizzare un file
router.get('/files/:filename', async (req, res) => {
    try {
        const file = await File.findOne({ filename: req.params.filename });
        if (!file) {
            return res.status(404).json({ error: 'File non trovato' });
        }

        res.set('Content-Type', file.mimetype);
        const downloadStream = gfs.openDownloadStreamByName(file.filename);
        downloadStream.on('error', (error) => {
            console.error('Errore stream:', error);
            res.status(500).json({ error: 'Errore durante il download del file' });
        });

        downloadStream.pipe(res);
    } catch (error) {
        console.error('Errore download:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rotta per ottenere i file di un post specifico
router.get('/post/:postId', async (req, res) => {
    try {
        const files = await File.find({ postId: req.params.postId });
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rotta per eliminare un file
router.delete('/files/:filename', async (req, res) => {
    try {
        const file = await File.findOne({ filename: req.params.filename });
        if (!file) {
            return res.status(404).json({ error: 'File non trovato' });
        }

        // Elimina il file da GridFS
        await gfs.delete(new mongoose.Types.ObjectId(file.fileId));
        
        // Elimina il record dal database
        await File.deleteOne({ _id: file._id });

        res.json({ message: 'File eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;