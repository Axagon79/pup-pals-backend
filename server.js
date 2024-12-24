require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const configureMulter = require('./config/multer');

const app = express();
const port = process.env.PORT || 5000;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pup-pals';

const corsOptions = {
  origin: 'https://pup-pals.vercel.app', // Dominio frontend
  credentials: true, // Abilita credenziali
  methods: ['GET', 'POST', 'OPTIONS'], // Metodi HTTP consentiti
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Origin'
  ]
};

app.use(cors(corsOptions));

let upload, saveFileToGridFS, deleteFileFromGridFS, bucket;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connesso a MongoDB');
    
    const multerConfig = await configureMulter(mongoose.connection);
    upload = multerConfig.upload;
    saveFileToGridFS = multerConfig.saveFileToGridFS;
    deleteFileFromGridFS = multerConfig.deleteFileFromGridFS;
    bucket = multerConfig.bucket;

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

    app.post('/api/upload', upload.single('file'), async (req, res) => {
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
            url: `/api/files/${filename}`
          }
        });
      } catch (error) {
        console.error('Errore upload:', error);
        res.status(500).json({ error: error.message });
      }
    });

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

    app.get('/api/files/post/:postId', async (req, res) => {
      try {
        const files = await File.find({ postId: req.params.postId });
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

    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: err.message });
    });

    app.listen(port, () => {
      console.log(`Server in esecuzione sulla porta ${port}`);
    });
  })
  .catch(err => console.error('Errore di connessione a MongoDB:', err));