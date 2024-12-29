const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalname: { // Corretto il nome del campo
        type: String,
        required: true
    },
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: { // Aggiunto il campo size
        type: Number,
        required: true
    },
    postId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    uploadTimestamp: {
        type: Date,
        default: () => new Date()
    },
    bucketName: {
      type: String,
      required: true
    }
});

module.exports = mongoose.model('File', FileSchema);