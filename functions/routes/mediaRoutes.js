const express = require('express');
const router = express.Router();
const path = require('path');
const rootDir = path.resolve(__dirname, '..', '..'); // Risale di due livelli per arrivare alla root
const configureMulter = require(path.resolve(__dirname, '..', 'config', 'multer'));
const File = require(path.resolve(rootDir, 'models', 'File'));
const authenticate = require(path.resolve(rootDir, 'middleware', 'auth'));
const mongoose = require('mongoose');
const multer = require('multer');

// Configura GridFS
let gfs;
mongoose.connection.once('open', () => {
    gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads'
    });
});

// Configura Multer
const multerConfig = configureMulter(mongoose.connection);
const { upload, saveFileToGridFS } = multerConfig; // Recupera sia upload che saveFileToGridFS

// Route per upload file
router.post('/upload', authenticate, async (req, res) => {
    console.log('Inizio processo di upload');
    
    try {
        // Utilizzo di una Promise per gestire l'upload
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

        console.log('Richiesta a /api/upload ricevuta');
        console.log('req.file:', req.file);
        console.log('req.body:', req.body);

        const userId = req.userId;
        const { postId } = req.body;

        if (!postId) {
            console.log('PostId mancante');
            return res.status(400).json({
                success: false,
                error: 'postId mancante',
                receivedData: req.body
            });
        }

        if (!userId) {
            console.log('UserId mancante');
            return res.status(400).json({
                success: false,
                error: 'userId mancante',
                receivedData: req.body
            });
        }

        if (!req.file) {
            console.log('Nessun file ricevuto');
            return res.status(400).json({
                success: false,
                error: 'Nessun file caricato'
            });
        }
        
        const savedFile = await saveFileToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype, userId, postId);
        console.log('File salvato in GridFS:', savedFile);

        const fileDoc = new File({
            filename: savedFile.filename,
            originalname: req.file.originalname,
            fileId: savedFile.fileId,
            mimetype: req.file.mimetype,
            size: req.file.size, // Recupera la dimensione dal req.file
            postId: postId,
            userId: userId,
            bucketName: savedFile.bucketName
        });

        await fileDoc.save();
        console.log('File documento salvato:', fileDoc._id);

        const fileUrl = `${req.protocol}://${req.get('host')}/api/files/${fileDoc.filename}`;

        res.status(201).json({
            success: true,
            file: {
                id: fileDoc._id,
                filename: fileDoc.filename,
                url: fileUrl,
                originalName: fileDoc.originalname,
                mimetype: fileDoc.mimetype,
                size: req.file.size // Recupera la dimensione dal req.file
            },
            postId,
            userId
        });

    } catch (error) {
        console.error('Errore completo:', error);
        
        // Gestione errori specifici
        if (error instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                error: 'Errore upload file',
                details: error.message
            });
        }

        // Errori generici
        res.status(500).json({
            success: false,
            error: 'Errore interno durante l\'upload',
            details: error.message
        });
    }
});

// Route per recuperare un file specifico
router.get('/files/:filename', async (req, res) => {
    try {
        console.log('Richiesta recupero file:', req.params.filename);

        const file = await File.findOne({ filename: req.params.filename });

        if (!file) {
            console.log('File non trovato:', req.params.filename);
            return res.status(404).json({
                success: false,
                error: 'File non trovato',
                filename: req.params.filename
            });
        }

        console.log('File trovato:', {
            id: file._id,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size
        });

        res.set('Content-Type', file.mimetype);

        const downloadStream = gfs.openDownloadStreamByName(file.filename);

        downloadStream.on('error', (error) => {
            console.error('Errore durante lo streaming del file:', error);
            res.status(500).json({
                success: false,
                error: 'Errore durante il download del file',
                details: error.message
            });
        });

        downloadStream.pipe(res);

    } catch (error) {
        console.error('Errore completo recupero file:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno durante il recupero del file',
            details: error.message
        });
    }
});

module.exports = router;