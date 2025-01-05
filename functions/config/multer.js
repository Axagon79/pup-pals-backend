const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const mongoose = require('mongoose');

const configureMulter = (mongooseConnection) => {
  // Configurazione upload con memoria temporanea
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      console.log('File ricevuto:', file);
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
        console.warn(`Tipo file non consentito: ${file.mimetype}, ${file.originalname}`);
        cb(new Error(`Tipo file non supportato: ${file.mimetype}`), false);
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 1
    }
  });

  // Funzione per salvare file in GridFS
  const saveFileToGridFS = async (fileBuffer, originalname, mimetype, userId, postId) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, async (cryptoErr, buf) => {
        if (cryptoErr) {
          console.error('Errore generazione nome file:', cryptoErr);
          return reject(cryptoErr);
        }

        try {
          const filename = `${buf.toString('hex')}${path.extname(originalname)}`;
          const bucket = new mongoose.mongo.GridFSBucket(mongooseConnection.db, {
            bucketName: 'uploads'
          });

          const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
              originalname,
              mimetype,
              userId,
              postId,
              uploadTimestamp: new Date().toISOString()
            }
          });

          // Gestione eventi stream
          uploadStream.on('error', (error) => {
            console.error('Errore durante l\'upload del file:', error);
            reject(error);
          });

          uploadStream.on('finish', () => {
            console.log('File salvato in GridFS:', filename);
            resolve({
              fileId: uploadStream.id,
              filename: filename,
              bucketName: 'uploads'
            });
          });

          // Upload del file
          uploadStream.write(fileBuffer);
          uploadStream.end();

        } catch (error) {
          console.error('Errore durante la configurazione dell\'upload:', error);
          reject(error);
        }
      });
    });
  };

  // Funzione per eliminare file da GridFS
  const deleteFileFromGridFS = async (fileId) => {
    try {
      const bucket = new mongoose.mongo.GridFSBucket(mongooseConnection.db, {
        bucketName: 'uploads'
      });
      await bucket.delete(new mongoose.Types.ObjectId(fileId));
      console.log(`File ${fileId} eliminato con successo`);
      return true;
    } catch (error) {
      console.error('Errore durante l\'eliminazione del file:', error);
      throw error;
    }
  };

  return {
    upload,
    saveFileToGridFS,
    deleteFileFromGridFS
  };
};

module.exports = configureMulter;