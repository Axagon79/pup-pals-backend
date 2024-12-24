require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const configureMulter = require('./config/multer');

const app = express();
const port = process.env.PORT || 5000;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pup-pals';

// Configurazione CORS più robusta
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://pup-pals.vercel.app', 
      'http://localhost:3000'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Non autorizzato da CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
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

// Middleware di logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Funzione di connessione a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
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
    const multerConfig = await configureMulter(connection);
    const { 
      upload, 
      saveFileToGridFS, 
      deleteFileFromGridFS, 
      bucket 
    } = multerConfig;

    // Definizione modelli
    const FileSchema = new mongoose.Schema({
      filename: String,
      originalName: String,
      fileId: mongoose.Schema.Types.ObjectId,
      mimetype: String,
      size: Number,
      uploadDate: { type: Date, default: Date.now },
      postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
      userId: { type: String, required: true }
    });

    const File = mongoose.model('File', FileSchema);

    const PostSchema = new mongoose.Schema({
      content: String,
      author: { type: String, required: true },
      files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
      createdAt: { type: Date, default: Date.now }
    });

    const Post = mongoose.model('Post', PostSchema);

    // Route di upload file
    app.post('/api/upload', upload.single('file'), async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'Nessun file caricato' });
        }

        if (!req.body.postId) {
          return res.status(400).json({ error: 'postId mancante' });
        }

        const userId = req.body.userId;
        if (!userId) {
          return res.status(400).json({ error: 'userId mancante' });
        }

        const { filename, fileId } = await saveFileToGridFS(req.file);

        const fileDoc = new File({
          filename,
          originalName: req.file.originalname,
          fileId,
          mimetype: req.file.mimetype,
          size: req.file.size,
          postId: req.body.postId,
          userId: userId
        });

        await fileDoc.save();

        const post = await Post.findById(req.body.postId);
        if (post) {
          post.files.push(fileId);
          await post.save();
        }

        res.json({
          success: true,
          file: {
            id: fileId,
            filename,
            originalName: req.file.originalname,
            url: `/api/files/${filename}`
          }
        });
      } catch (error) {
        next(error);
      }
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

    // Middleware di gestione errori Multer
    app.use((err, req, res, next) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ 
          error: 'Errore durante l\'upload',
          details: err.message 
        });
      }
      next(err);
    });

    // Middleware di errore globale
    app.use((err, req, res, next) => {
      console.error('Errore non gestito:', err);
      res.status(500).json({ 
        error: 'Errore interno del server',
        message: err.message 
      });
    });

    // Avvia il server
    const server = app.listen(port, () => {
      console.log(`Server in esecuzione sulla porta ${port}`);
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

  } catch (error) {
    console.error('Errore durante l\'avvio del server:', error);
    process.exit(1);
  }
};

// Avvia il server
startServer();