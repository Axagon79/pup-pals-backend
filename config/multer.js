const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');

const configureMulter = (mongooseConnection) => {
  console.log('Connessione ricevuta:', mongooseConnection);

  if (!mongooseConnection) {
    throw new Error('Connessione MongoDB non fornita');
  }

  // Usa la stringa di connessione dell'ambiente
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('Stringa di connessione MongoDB non definita');
  }

  // Configura GridFS Storage
  const storage = new GridFsStorage({
    url: mongoUri,
    file: (req, file) => {
      return {
        filename: `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`,
        bucketName: 'uploads', // Nome del bucket GridFS
        metadata: {
          originalName: file.originalname,
          mimetype: file.mimetype
        }
      };
    },
  });

  // Filtra i tipi di file consentiti
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
      cb(new Error('Tipo di file non supportato'), false);
    }
  };

  // Middleware di upload con Multer
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { 
      fileSize: 50 * 1024 * 1024, // Limite: 50 MB
      files: 1 // Limita a un file per volta
    }
  });

  return {
    upload,
    saveFileToGridFS: (file) => {
      // Questa funzione sarà gestita automaticamente da GridFsStorage
      return new Promise((resolve, reject) => {
        const uploadStream = storage.uploadStream(file.originalname);
        
        uploadStream.on('file', (file) => {
          resolve({
            filename: file.filename,
            fileId: file.id
          });
        });

        uploadStream.on('error', (error) => {
          reject(error);
        });

        uploadStream.write(file.buffer);
        uploadStream.end();
      });
    },
    deleteFileFromGridFS: async (fileId) => {
      // Implementa la logica di eliminazione se necessario
      // Potrebbe richiedere l'uso di mongoose o mongodb direttamente
    },
    bucket: null // Non necessario con multer-gridfs-storage
  };
};

module.exports = configureMulter;