const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');

const configureMulter = (mongooseConnection) => {
  const storage = new GridFsStorage({
    url: process.env.MONGODB_URI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        try {
          console.log("req.body (in multer config):", req.body);
          console.log("req.user (in multer config):", req.user);

          crypto.randomBytes(16, (cryptoErr, buf) => {
            if (cryptoErr) {
              console.error('Errore generazione nome file:', cryptoErr);
              return reject(cryptoErr);
            }

            if (!file || !file.originalname) {
              console.error('File non valido:', file);
              return reject(new Error('File non valido'));
            }

            const filename = `${buf.toString('hex')}${path.extname(file.originalname)}`;

            // Dichiarazione e assegnazione di userId e postId DENTRO la callback
            const userId = req.body?.userId || req.user?.id || 'unknown';
            const postId = req.body?.postId || 'unknown';

            console.log("userId (in multer config):", userId);
            console.log("postId (in multer config):", postId);

            const fileInfo = {
              filename: filename,
              bucketName: 'uploads',
              metadata: {
                originalname: file.originalname,
                mimetype: file.mimetype,
                userId: userId,
                postId: postId,
                uploadTimestamp: new Date().toISOString()
              }
            };

            console.log('Preparazione upload file:', {
              originalName: file.originalname,
              mimetype: file.mimetype,
              generatedFilename: filename
            });

            resolve(fileInfo);
          });
        } catch (error) {
          console.error('Errore fatale preparazione file:', error);
          reject(error);
        }
      });
    },
    options: {
      useNewUrlParser: false,
      useUnifiedTopology: false
    }
  });

  storage.on('connectionError', (err) => {
    console.error('Errore connessione GridFS:', err);
  });

  storage.on('error', (err) => {
    console.error('Errore GridFS:', err);
  });

  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];

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


  return { upload, storage }; // Puoi rimuovere saveFile e deleteFile se non li usi direttamente qui
};


module.exports = configureMulter;