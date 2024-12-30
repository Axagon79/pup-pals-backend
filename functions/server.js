require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const rootDir = path.resolve(__dirname, '..');
const configureMulter = require(path.resolve(__dirname, 'config', 'multer'));
const mediaRoutes = require(path.resolve(__dirname, 'routes', 'mediaRoutes'));
const postRoutes = require(path.resolve(__dirname, 'routes', 'postRoutes'));
const cors = require('cors');
const helmet = require('helmet');

// Validazione variabili d'ambiente
if (!process.env.MONGODB_URI) {
  console.error('ERRORE: MONGODB_URI non definito');
  process.exit(1);
}

const app = express();

// Configura CORS prima di qualsiasi altro middleware o rotta
app.use(cors({
  origin: 'https://pup-pals.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware di base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', mediaRoutes);
app.use('/api/posts', postRoutes);

// Funzione di connessione a MongoDB
const connectDB = async (retries = 5) => {
  while (retries > 0) {
      try {
          await mongoose.connect(process.env.MONGODB_URI);
          console.log('Connesso a MongoDB');
          return mongoose.connection;
      } catch (error) {
          console.error(`Tentativo fallito, rimangono ${retries} tentativi`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 5000));
      }
  }
  throw new Error('Impossibile connettersi a MongoDB');
};

// Funzione principale di avvio del server
const startServer = async () => {
  try {
    // Connetti al database
    const connection = await connectDB();

    // Configura Multer
    const multerConfig = await configureMulter(mongoose.connection);
    const { 
      upload, 
      saveFileToGridFS, 
      deleteFileFromGridFS, 
      bucket 
    } = multerConfig;

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
    
    // Route per scaricare file
    app.get('/api/files/:filename', async (req, res) => {
      try {
        // Imposta headers per consentire il download delle immagini
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

    // Route per recuperare file di un post
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

    // Route per eliminare un file
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

    // Health check endpoint
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

      // Gestione specifica degli errori Multer
      if (err instanceof multer.MulterError) {
          return res.status(400).json({ 
              success: false,
              error: 'Errore durante l\'upload del file',
              details: err.message 
          });
      }

      // Gestione degli errori di dimensione file
      if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
              success: false,
              error: 'File troppo grande',
              details: 'Il file supera la dimensione massima consentita'
          });
      }

      // Gestione degli errori generici
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
    console.error('Errore durante l\'avvio del server:', error);
    process.exit(1);
  }
};