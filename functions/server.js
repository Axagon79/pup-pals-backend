const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });


const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const functions = require('firebase-functions');
const File = require('./models/File');
const Post = require('./models/Post');

// Importazioni relative
const configureMulter = require('./config/multer');
const mediaRoutes = require('./routes/mediaRoutes');
const postRoutes = require('./routes/postRoutes');

// Verifica delle variabili d'ambiente critiche
const requiredEnvVars = ['MONGODB_URI', 'PORT', 'JWT_SECRET'];
requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`ERRORE CRITICO: Variabile ${varName} non definita`);
    }
});

// Log di debug delle variabili caricate
console.log('Variabili d\'ambiente caricate:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Caricata' : 'Non caricata');
console.log('PORT:', process.env.PORT || 'Non definita');

const app = express();

// Configura CORS
app.use(cors({
    origin: 'https://pup-pals.vercel.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware di base
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ottieni MongoDB URI da variabili d'ambiente
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
    console.error('ERRORE CRITICO: MONGODB_URI non definito');
    throw new Error('MONGODB_URI non definito');
}

// Funzione di connessione a MongoDB
const connectDB = async (retries = 5) => {
    console.log('Tentativo di connessione a MongoDB con URI:', mongoUri);

    while (retries > 0) {
        try {
            await mongoose.connect(mongoUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('Connesso a MongoDB');
            return mongoose.connection;
        } catch (error) {
            console.error(`Errore di connessione: ${error.message}`);
            console.error(`Tentativo fallito, rimangono ${retries} tentativi`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    throw new Error('Impossibile connettersi a MongoDB');
};

// Logging middleware
app.use((req, res, next) => {
    console.log(`
=== NUOVA RICHIESTA ===
Metodo: ${req.method}
Path: ${req.path}
Origin: ${req.headers.origin}
Headers: ${JSON.stringify(req.headers, null, 2)}
`);
    next();
});

// Inizializzazione dell'app
const initializeApp = async () => {
    try {
        const connection = await connectDB();
        const multerConfig = await configureMulter(connection);
        const { upload, saveFileToGridFS, deleteFileFromGridFS, bucket } = multerConfig;

        // Routes
        app.use('/api', mediaRoutes);
        app.use('/api/posts', postRoutes);

        // File routes
        app.get('/api/files/:filename', async (req, res) => {
            try {
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=86400');
                
                const downloadStream = bucket.openDownloadStreamByName(req.params.filename);

                downloadStream.on('data', (chunk) => {
                    res.write(chunk);
                });

                downloadStream.on('error', (error) => {
                    console.error('Errore stream:', error);
                    res.status(404).json({ error: 'File non trovato' });
                });

                downloadStream.on('end', () => {
                    console.log('Download completato');
                    res.end();
                });
            } catch (error) {
                console.error('Errore download:', error);
                res.status(500).json({ error: error.message });
            }
        });

        app.get('/api/files/post/:postId', async (req, res) => {
            try {
                const files = await File.find({ postId: req.params.postId });
                console.log(`File trovati: ${files.length}`);
                res.json(files);
            } catch (error) {
                console.error('Errore recupero file del post:', error);
                res.status(500).json({ error: error.message });
            }
        });

        app.delete('/api/files/:filename', async (req, res) => {
            try {
                const file = await File.findOne({ filename: req.params.filename });
                if (!file) {
                    return res.status(404).json({ error: 'File non trovato' });
                }

                await deleteFileFromGridFS(file.fileId);
                await File.deleteOne({ _id: file._id });

                const post = await Post.findById(file.postId);
                if (post) {
                    post.files = post.files.filter(
                        (fileId) => fileId.toString() !== file.fileId.toString()
                    );
                    await post.save();
                }

                res.json({ message: 'File eliminato con successo' });
            } catch (error) {
                console.error('Errore eliminazione:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Health check
        app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // Middleware di gestione errori Multer
        app.use((err, req, res, next) => {
            console.error(`
=== ERRORE MIDDLEWARE ===
Tipo di errore: ${err.constructor.name}
Messaggio: ${err.message}
Stack: ${err.stack}
`);

            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    error: 'Errore durante l\'upload del file',
                    details: err.message
                });
            }

            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: 'File troppo grande',
                    details: 'Il file supera la dimensione massima consentita'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Errore interno del server',
                details: err.message
            });
        });

        // Middleware di errore globale
        app.use((err, req, res, next) => {
            console.error(`
=== ERRORE NON GESTITO ===
Errore: ${err}
Stack: ${err.stack}
`);

            res.status(500).json({
                error: 'Errore interno del server',
                message: err.message
            });
        });

    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        throw error;
    }
};

// Inizializza l'app
initializeApp().catch(console.error);

// Esporta l'app per Firebase Functions
module.exports = app;