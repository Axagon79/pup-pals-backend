require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const configureMulter = require('./config/multer');
const path = require('path');
const mediaRoutes = require('./routes/mediaRoutes');
const postRoutes = require('./routes/postRoutes');

// Validazione variabili d'ambiente
if (!process.env.MONGODB_URI) {
  console.error('ERRORE: MONGODB_URI non definito');
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 5000;

// Configurazione CORS avanzata
const corsOptions = {
  origin: function (origin, callback) {
    console.log('Origine richiesta:', origin);
    const allowedOrigins = [
      'https://pup-pals.vercel.app',
      'http://localhost:3000'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      console.log('Origine consentita');
      callback(null, true);
    } else {
      console.log('Origine NON consentita');
      callback(new Error('Origine non autorizzata'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin'
  ]
};

// Middleware di base
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', mediaRoutes);
app.use('/api/posts', postRoutes);

// Middleware di logging dettagliato
app.use((req, res, next) => {
  console.log(`
=== NUOVA RICHIESTA ===
Timestamp: ${new Date().toISOString()}
Metodo: ${req.method}
Path: ${req.path}
Headers: ${JSON.stringify(req.headers, null, 2)}
`);
  next();
});

// Funzione di connessione a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connesso a MongoDB');
    return mongoose.connection;
  } catch (error) {
    console.error('Errore di connessione a MongoDB:', error);
    process.exit(1);
  }
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

    app.options('*', cors(corsOptions));

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

    // Avvia il server
    const server = app.listen(port, () => {
      console.log(`
      === SERVER AVVIATO ===
      Porta: ${port}
      Timestamp: ${new Date().toISOString()}
      `);
    });

    // Gestione chiusura server
    process.on('SIGTERM', () => {
      console.log('Processo SIGTERM ricevuto. Chiusura server...');
      server.close(() => {
        console.log('Server chiuso');
        mongoose.connection.close(false, () => {
          console.log('Connessione MongoDB chiusa');
          process.exit(0);
        });
      });
    });

    // Gestione errori non catturati
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Promessa non gestita:', reason);
      mongoose.connection.close(false, () => {
        process.exit(1);
      });
    });

  } catch (error) {
    console.error('Errore durante l\'avvio del server:', error);
    process.exit(1);
  }
};

// Avvia il server
startServer();