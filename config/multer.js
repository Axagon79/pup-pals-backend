const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');

const configureMulter = (mongooseConnection) => {
  console.log('Configurazione Multer iniziata');

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI non definito nelle variabili d\'ambiente');
  }

  // Crea storage GridFS
  const storage = new GridFsStorage({
    url: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    },
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads',
            metadata: {
              originalname: file.originalname,
              mimetype: file.mimetype,
              userId: req.body.userId,
              postId: req.body.postId
            }
          };
          
          console.log('File info creato:', fileInfo);
          resolve(fileInfo);
        });
      });
    }
  });

  // Gestione errori storage
  storage.on('connectionError', function(err) {
    console.error('Errore connessione GridFS:', err);
  });

  storage.on('error', function(err) {
    console.error('Errore GridFS:', err);
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'video/mp4', 
      'video/quicktime', 
      'video/x-msvideo',
      'audio/mpeg',
      'audio/wav'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo file non supportato: ${file.mimetype}`), false);
    }
  };

  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { 
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 1
    }
  });

  return {
    upload,
    storage,
    // Metodo per salvare file
    saveFile: async (fileData) => {
      try {
        const uploadResponse = await storage.fromFile(fileData);
        console.log('File salvato:', uploadResponse);
        return uploadResponse;
      } catch (error) {
        console.error('Errore salvataggio file:', error);
        throw error;
      }
    },
    // Metodo per eliminare file
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