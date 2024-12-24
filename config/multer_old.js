const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');

// Configura GridFS Storage
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI, // Stringa di connessione a MongoDB
  file: (req, file) => {
    return {
      filename: `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`,
      bucketName: 'uploads', // Nome del bucket GridFS
    };
  },
});

// Filtra i tipi di file consentiti
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
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
  limits: { fileSize: 50 * 1024 * 1024 }, // Limite: 50 MB
});

module.exports = upload;