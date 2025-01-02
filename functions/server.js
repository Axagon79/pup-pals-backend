require('dotenv').config({ path: '../.env' });
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const configureMulter = require('./config/multer');
const path = require('path');
const mediaRoutes = require('./routes/mediaRoutes');
const postRoutes = require('./routes/postRoutes');
const cors = require('cors');
const functions = require('firebase-functions'); // Importa firebase-functions
const { GoogleGenerativeAI } = require('@google/generative-ai');
console.log("Directory corrente:", __dirname);
console.log("Variabili d'ambiente:", process.env);
console.log("MONGODB_URI:", process.env.MONGODB_URI);



// Validazione variabili d'ambiente
if (!process.env.MONGODB_URI) {
  console.error('ERRORE: MONGODB_URI non definito');
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 5000; 
// Configura CORS prima di qualsiasi altro middleware o rotta
app.use(cors({
  origin: ['https://pup-pals.vercel.app', 'http://localhost:3000'],
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
    app.listen(port, () => {
      console.log(`Server in ascolto sulla porta ${port}`);
    });
    let geminiModel;
if (process.env.GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
} else {
  console.error("Errore: la variabile d'ambiente GEMINI_API_KEY non è impostata.");
}


app.post('/api/vet-assistant', async (req, res) => {
  console.log("Richiesta ricevuta sull'endpoint /api/vet-assistant");
  console.log("Body della richiesta:", req.body);
  try {
    if (!geminiModel) {
      return res.status(500).json({ error: 'Assistente virtuale non disponibile.' });
    }

    const { systemPrompt, animalDetails, conversationHistory, question } = req.body;

    let fullPrompt = `${systemPrompt || ''}\n\n`;
    if (animalDetails) {
      fullPrompt += `PROFILO ANIMALE AGGIORNATO:\n${animalDetails}\n`;
    }
    if (conversationHistory) {
      fullPrompt += `CONTESTO CONVERSAZIONE:\n${conversationHistory}\n`;
    }
    fullPrompt += `\nNUOVA DOMANDA: ${question}\n\nISTRUZIONI SPECIALI:\n`;
    fullPrompt += `- Rispondi SEMPRE in italiano in modo conciso e naturale, tenendo conto del profilo animale.\n`;
    fullPrompt += `- Fornisci informazioni utili e pratiche.\n`;
    fullPrompt += `- Usa un linguaggio chiaro e comprensibile.\n`;
    fullPrompt += `- Mostra empatia e comprensione verso l'utente.\n`;
    fullPrompt += `- NON ripetere nessuna parte del prompt o del contesto nella tua risposta.\n`;

    const result = await geminiModel.generateContent(fullPrompt);
    const responseText = result.response.text(); // Ottieni il testo con .text()
    
    res.json({ response: responseText });
  } catch (error) {
    console.error('Errore Gemini:', error);
    res.status(500).json({ 
      error: 'Errore durante la generazione della risposta.',
      details: error.message 
    });
  }
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

    // Gestione chiusura server
    process.on('SIGTERM', () => {
      console.log('Processo SIGTERM ricevuto. Chiusura server...');
      // server.close(() => {  // Rimuovi questa riga
        console.log('Server chiuso');
        mongoose.connection.close(false, () => {
          console.log('Connessione MongoDB chiusa');
          process.exit(0);
        });
      // }); // Rimuovi questa riga
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

// Chiusura connessione alla chiusura dell'app
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Connessione Mongoose chiusa per termine applicazione');
  process.exit(0);
});

exports.api = functions.https.onRequest(app); // Aggiungi questa riga

startServer() // Chiama startServer una sola volta all'avvio
  .then(() => console.log("Server configurato correttamente"))
  .catch(error => console.error("Errore durante la configurazione del server:", error));
