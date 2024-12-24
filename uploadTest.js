const { MongoClient, GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function uploadFile() {
  const url = 'mongodb://127.0.0.1:2018';
  const dbName = 'pup-pals';
  const filePath = 'C:\\Users\\lollo\\Pictures\\Saved Pictures\\1605723568731.jpg';

  try {
    // Verifica esistenza file
    if (!fs.existsSync(filePath)) {
      console.error('File non trovato:', filePath);
      return;
    }

    console.log('Dimensione file:', fs.statSync(filePath).size, 'bytes');

    // Connessione al client MongoDB
    const client = new MongoClient(url);
    await client.connect();
    console.log('Connesso a MongoDB');

    const db = client.db(dbName);
    const bucket = new GridFSBucket(db);

    // Stream per caricare il file
    const uploadStream = bucket.openUploadStream(path.basename(filePath), {
      metadata: {
        uploadedBy: 'test-user',
        uploadDate: new Date(),
        originalPath: filePath
      }
    });

    // Pipe del file
    const fileStream = fs.createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      fileStream
        .pipe(uploadStream)
        .on('finish', () => {
          console.log('File caricato con successo');
          client.close();
          resolve();
        })
        .on('error', (err) => {
          console.error('Errore caricamento:', err);
          client.close();
          reject(err);
        });
    });

  } catch (error) {
    console.error('Errore:', error);
    throw error;
  }
}

// Esecuzione
uploadFile()
  .then(() => {
    console.log('Upload completato');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Errore finale:', error);
    process.exit(1);
  });