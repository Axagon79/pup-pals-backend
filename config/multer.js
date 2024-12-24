const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const crypto = require('crypto');
const path = require('path');

const generateFileName = (file) => {
  return `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname)}`;
};

const configureMulter = (mongooseConnection) => {
  if (!mongooseConnection) {
    throw new Error('Connessione MongoDB non fornita');
  }
  
  // Attendiamo che la connessione sia pronta
  return new Promise((resolve, reject) => {
    if (mongooseConnection.readyState === 1) {
      setup();
    } else {
      mongooseConnection.on('connected', setup);
    }

    function setup() {
      try {
        const bucket = new GridFSBucket(mongooseConnection.db, {
          bucketName: 'uploads'
        });

        const storage = multer.memoryStorage();

        const upload = multer({
          storage,
          limits: { fileSize: 20 * 1024 * 1024 },
          fileFilter: (req, file, cb) => {
            const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
            if (allowedMimes.includes(file.mimetype)) {
              cb(null, true);
            } else {
              cb(new Error('Tipo di file non supportato'), false);
            }
          }
        });

        const saveFileToGridFS = async (file) => {
          const filename = generateFileName(file);
          const uploadStream = bucket.openUploadStream(filename);
          uploadStream.end(file.buffer);

          return new Promise((resolve, reject) => {
            uploadStream.on('finish', () => resolve({ filename, fileId: uploadStream.id }));
            uploadStream.on('error', reject);
          });
        };

        const deleteFileFromGridFS = async (fileId) => {
          try {
            await bucket.delete(fileId);
          } catch (error) {
            console.error('Errore durante l\'eliminazione del file:', error);
            throw error;
          }
        };

        resolve({ upload, saveFileToGridFS, deleteFileFromGridFS, bucket });
      } catch (error) {
        reject(error);
      }
    }
  });
};

module.exports = configureMulter;