const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');

const configureMulter = (mongooseConnection) => {
  const storage = new GridFsStorage({
    url: process.env.MONGODB_URI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        // Aggiunta di più robusti controlli e logging
        try {
          // Gestione errori crypto
          crypto.randomBytes(16, (cryptoErr, buf) => {
            if (cryptoErr) {
              console.error('Errore generazione nome file:', cryptoErr);
              return reject(cryptoErr);
            }
            
            // Validazione file
            if (!file || !file.originalname) {
              console.error('File non valido:', file);
              return reject(new Error('File non valido'));
            }

            // Generazione nome file sicura
            const filename = `${buf.toString('hex')}${path.extname(file.originalname)}`;
            
            // Metadati con valori di default
            const fileInfo = {
              filename: filename,
              bucketName: 'uploads',
              metadata: {
                originalname: file.originalname,
                mimetype: file.mimetype,
                userId: req.body?.userId || req.user?.id || 'unknown',
                postId: req.body?.postId || 'unknown',
                uploadTimestamp: new Date().toISOString()
              }
            };
            
            // Log dettagliato
            console.log('Preparazione upload file:', {
              originalName: file.originalname,
              mimetype: file.mimetype,
              generatedFilename: filename
            });

            resolve(fileInfo);
          });
        } catch (error) {
          // Cattura errori generici
          console.error('Errore fatale preparazione file:', error);
          reject(error);
        }
      });
    },
    
    // Configurazione globale più robusta
    options: {
      useNewUrlParser: false,
      useUnifiedTopology: false
    }
  });

  // Gestori di errori aggiuntivi
  storage.on('connectionError', (err) => {
    console.error('Errore connessione GridFS:', err);
  });

  storage.on('error', (err) => {
    console.error('Errore GridFS:', err);
  });

  // Configurazione Multer con gestione errori
  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      // Validazione tipo file più dettagliata
      const allowedTypes = [
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/webp',
        'video/mp4', 
        'video/quicktime'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        console.warn(`Tipo file non consentito: ${file.mimetype}`);
        cb(new Error(`Tipo file non supportato: ${file.mimetype}`), false);
      }
    },
    limits: { 
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 1
    }
  });

  return {
    upload,
    storage,
    // Metodi di gestione file con error handling
    saveFile: async (fileData) => {
      try {
        const uploadResponse = await storage.fromFile(fileData);
        console.log('File salvato con successo:', uploadResponse);
        return uploadResponse;
      } catch (error) {
        console.error('Errore salvataggio file:', error);
        throw error;
      }
    },
    deleteFile: async (fileId) => {
      try {
        await storage.delete(fileId);
        console.log('File eliminato:', fileId);
        return true;
      } catch (error) {
        console.error('Errore eliminazione file:', error);
        throw error;
      }
    }
  };
};

module.exports = configureMulter;