const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const crypto = require('crypto');
const path = require('path');

const generateFileName = (file) => {
  return `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname)}`;
};

const configureMulter = (mongooseConnection) => {
  console.log('Connessione ricevuta:', mongooseConnection);
  
  if (!mongooseConnection) {
    throw new Error('Connessione MongoDB non fornita');
  }
  
  return new Promise((resolve, reject) => {
    try {
      // Usa il client MongoDB direttamente
      const client = mongooseConnection.connection.getClient();
      const db = client.db(mongooseConnection.connection.db.databaseName);
      
      console.log('Database:', db);
      
      if (!db) {
        throw new Error('Database non disponibile');
      }
      
      const bucket = new GridFSBucket(db, {
        bucketName: 'uploads'
      });

      const storage = multer.memoryStorage();

      const upload = multer({
        storage,
        limits: { 
          fileSize: 50 * 1024 * 1024, // 50MB
          files: 1 // Limita a un file per volta
        },
        fileFilter: (req, file, cb) => {
          const allowedMimes = [
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
          
          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error('Tipo di file non supportato'), false);
          }
        }
      });

      const saveFileToGridFS = async (file) => {
        const filename = generateFileName(file);
        
        return new Promise((resolve, reject) => {
          const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
              originalName: file.originalname,
              mimetype: file.mimetype
            }
          });
          
          uploadStream.on('finish', () => {
            resolve({ 
              filename, 
              fileId: uploadStream.id 
            });
          });

          uploadStream.on('error', (error) => {
            console.error('Errore durante il salvataggio del file:', error);
            reject(error);
          });

          // Scrivi il buffer nel flusso
          uploadStream.write(file.buffer);
          uploadStream.end();
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

      const getFileFromGridFS = async (filename) => {
        return new Promise((resolve, reject) => {
          const downloadStream = bucket.openDownloadStreamByName(filename);
          const chunks = [];

          downloadStream.on('data', (chunk) => {
            chunks.push(chunk);
          });

          downloadStream.on('error', (error) => {
            reject(error);
          });

          downloadStream.on('end', () => {
            const fileBuffer = Buffer.concat(chunks);
            resolve(fileBuffer);
          });
        });
      };

      resolve({ 
        upload, 
        saveFileToGridFS, 
        deleteFileFromGridFS, 
        getFileFromGridFS,
        bucket 
      });
    } catch (error) {
      console.error('Errore durante la configurazione di Multer:', error);
      reject(error);
    }
  });
};

module.exports = configureMulter;