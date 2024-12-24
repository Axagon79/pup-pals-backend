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
  
  return new Promise((resolve, reject) => {
    const setup = () => {
      try {
        // Usa la connessione del database direttamente
        const db = mongooseConnection.connection.db;
        
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
              'audio/wav',
              'application/pdf'
            ];
            
            if (allowedMimes.includes(file.mimetype)) {
              cb(null, true);
            } else {
              cb(new Error(`Tipo di file non supportato: ${file.mimetype}`), false);
            }
          }
        });

        const saveFileToGridFS = async (file) => {
          const filename = generateFileName(file);
          
          return new Promise((resolve, reject) => {
            const uploadStream = bucket.openUploadStream(filename, {
              metadata: {
                originalName: file.originalname,
                mimetype: file.mimetype,
                uploadedAt: new Date()
              }
            });
            
            uploadStream.on('finish', () => {
              resolve({ 
                filename, 
                fileId: uploadStream.id 
              });
            });

            uploadStream.on('error', (error) => {
              console.error(`Errore durante il salvataggio del file ${filename}:`, error);
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
            console.log(`File con ID ${fileId} eliminato con successo`);
          } catch (error) {
            console.error(`Errore durante l'eliminazione del file con ID ${fileId}:`, error);
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
              console.error(`Errore durante il download del file ${filename}:`, error);
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
    };

    // Gestisci lo stato della connessione
    const connection = mongooseConnection.connection;
    
    if (connection.readyState === 1) {
      setup();
    } else {
      connection.once('connected', setup);
      connection.on('error', (error) => {
        console.error('Errore di connessione MongoDB:', error);
        reject(error);
      });
    }
  });
};

module.exports = configureMulter;