const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer'); // Importa multer
const configureMulter = require('../config/multer');
const File = require('../models/File');
const authenticate = require('../middleware/auth');

// Configura GridFS
let gfs;
mongoose.connection.once('open', () => {
    gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads'
    });
});

// Configura Multer
const multerConfig = configureMulter(mongoose.connection);
const upload = multerConfig.upload;

// Route per upload file
router.post('/upload', authenticate, (req, res) => {
    upload.single('file')(req, res, async (err) => { // Gestione errore DENTRO upload.single
        if (err) {
            console.error('Errore Multer:', err);
            if (err instanceof multer.MulterError) {
                // Gestione errori specifici di Multer
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        error: 'File too large',
                        details: 'The file exceeds the maximum allowed size'
                    });
                } else {
                    return res.status(400).json({
                        success: false,
                        error: 'File upload error',
                        details: err.message
                    });
                }
            } else {
                // Gestione altri errori
                return res.status(500).json({
                    success: false,
                    error: 'Internal server error during upload',
                    details: err.message
                });
            }
        }

        // Se arrivi qui, l'upload è andato a buon fine (nessun errore in upload.single)
        try {
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
                console.log('Nessun file caricato');
                return res.status(400).json({
                    success: false,
                    error: 'Nessun file caricato'
                });
            }

            const fileDoc = new File({
                filename: req.file.filename,
                originalName: req.file.originalname,
                fileId: req.file.id,
                mimetype: req.file.mimetype,
                size: req.file.size,
                postId: postId,
                userId: userId
            });

            await fileDoc.save();

            const fileUrl = `${req.protocol}://${req.get('host')}/api/files/${fileDoc.filename}`;

            res.status(201).json({
                success: true,
                file: {
                    id: fileDoc._id,
                    filename: fileDoc.filename,
                    url: fileUrl,
                    originalName: fileDoc.originalName,
                    mimetype: fileDoc.mimetype,
                    size: fileDoc.size
                },
                postId,
                userId
            });
        } catch (error) {
            console.error('Errore upload (interno try-catch):', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }); // Fine gestione errore in upload.single
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