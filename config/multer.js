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
              const error = new Error('File non valido: nessun nome file fornito');
              console.error('File non valido:', file, error);
              return reject(error);
            }

            const filename = `${buf.toString('hex')}${path.extname(file.originalname)}`;

            const userId = req.body?.userId || (req.user ? req.user.id : 'unknown');
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
      console.log('File ricevuto:', file);
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        console.warn(`Tipo file non consentito: ${file.mimetype}, ${file.originalname}`);
        cb(new Error(`Tipo file non supportato: ${file.mimetype}`), false);
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 1
    }
  });

  return { upload };
};

module.exports = configureMulter;