const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const { ObjectId } = require('mongodb');

const configureMulter = (mongooseConnection) => {
  const upload = multer({
    storage: multer.memoryStorage(), // Salva temporaneamente il file in memoria
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

  const saveFileToGridFS = async (fileBuffer, originalname, mimetype, userId, postId) => {
      return new Promise((resolve, reject) => {
          crypto.randomBytes(16, async (cryptoErr, buf) => {
              if (cryptoErr) {
                  console.error('Errore generazione nome file:', cryptoErr);
                  return reject(cryptoErr);
              }
              const filename = `${buf.toString('hex')}${path.extname(originalname)}`;
              const bucket = new mongoose.mongo.GridFSBucket(mongooseConnection.db, {
                  bucketName: 'uploads'
              });
              const uploadStream = bucket.openUploadStream(filename, {
                  metadata: {
                      originalname: originalname,
                      mimetype: mimetype,
                      userId: userId,
                      postId: postId,
                      uploadTimestamp: new Date().toISOString()
                  }
              });

              uploadStream.on('error', (err) => {
                  console.error('Errore durante l\'upload del file:', err);
                  reject(err);
              });

              uploadStream.on('finish', () => {
                  console.log('File salvato in GridFS:', filename);
                  resolve({
                    fileId: uploadStream.id,
                    filename: filename,
                    bucketName: 'uploads'
                  });
              });

              uploadStream.write(fileBuffer);
              uploadStream.end();
          });
      });
  };

  return { upload, saveFileToGridFS };
};

module.exports = configureMulter;