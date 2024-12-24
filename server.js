require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const configureMulter = require('./config/multer');

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
    const allowedOrigins = [
      'https://pup-pals.vercel.app', 
      'http://localhost:3000'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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

    // Middleware di validazione upload
    const validateUpload = (req, res, next) => {
      console.log(`
=== VALIDAZIONE UPLOAD ===
Body ricevuto: ${JSON.stringify(req.body, null, 2)}
`);
      
      const { postId, userId } = req.body;
      
      console.log(`PostId: ${postId}`);
      console.log(`UserId: ${userId}`);

      if (!postId) {
        console.log('ERRORE: postId mancante');
        return res.status(400).json({ error: 'postId mancante' });
      }

      if (!userId) {
        console.log('ERRORE: userId mancante');
        return res.status(400).json({ error: 'userId mancante' });
      }

      next();
    };

    // Route di upload file
    app.post('/api/upload', 
      validateUpload, 
      upload.single('file'), 
      async (req, res, next) => {
        try {
          console.log(`
=== ELABORAZIONE UPLOAD ===
File ricevuto: ${JSON.stringify(req.file, null, 2)}
Body durante upload: ${JSON.stringify(req.body, null, 2)}
`);

          if (!req.file) {
            console.log('ERRORE: Nessun file caricato');
            return res.status(400).json({ error: 'Nessun file caricato' });
          }

          const { filename, fileId } = await saveFileToGridFS(req.file);

          console.log(`File salvato in GridFS: 
- Filename: ${filename}
- FileId: ${fileId}`);

          const fileDoc = new File({
            filename,
            originalName: req.file.originalname,
            fileId,
            mimetype: req.file.mimetype,
            size: req.file.size,
            postId: req.body.postId,
            userId: req.body.userId
          });

          await fileDoc.save();
          console.log('Documento file salvato nel database');

          const post = await Post.findById(req.body.postId);
          if (post) {
            post.files.push(fileId);
            await post.save();
            console.log('File aggiunto al post');
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
          console.error('ERRORE DURANTE UPLOAD:', error);
          next(error);
        }
      }
    );

    // Route per scaricare file
    app.get('/api/files/:filename', async (req, res) => {
      try {
        console.log(`
=== DOWNLOAD FILE ===
Filename richiesto: ${req.params.filename}
`);

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
        console.log(`
=== RECUPERO FILE POST ===
PostId: ${req.params.postId}
`);

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
        console.log(`
=== ELIMINAZIONE FILE ===
Filename: ${req.params.filename}
`);

const file = await File.findOne({ filename: req.params.filename });
if (!file) {
  console.log('File non trovato');
  return res.status(404).json({ error: 'File non trovato' });
}

console.log(`File trovato: 
- ID: ${file._id}
- PostId: ${file.postId}
`);

await deleteFileFromGridFS(file.fileId);
console.log('File eliminato da GridFS');

await File.deleteOne({ _id: file._id });
console.log('Record file eliminato dal database');

const post = await Post.findById(file.postId);
if (post) {
  post.files = post.files.filter(
    (fileId) => fileId.toString() !== file.fileId.toString()
  );
  await post.save();
  console.log('File rimosso dalla lista dei file del post');
}

res.json({ message: 'File eliminato con successo' });
} catch (error) {
console.error('Errore eliminazione:', error);
res.status(500).json({ error: error.message });
}
});

// Health check endpoint
app.get('/health', (req, res) => {
console.log('=== HEALTH CHECK ===');
res.status(200).json({
status: 'healthy',
timestamp: new Date().toISOString(),
uptime: process.uptime()
});
});

// Middleware di gestione errori Multer
app.use((err, req, res, next) => {
console.error(`
=== ERRORE MULTER ===
Errore: ${err}
`);

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
process.on('uncaughtException', (error) => {
console.error('Eccezione non catturata:', error);
mongoose.connection.close(false, () => {
process.exit(1);
});
});

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