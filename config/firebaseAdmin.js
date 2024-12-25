const admin = require('firebase-admin');
const serviceAccount = require('./puppals-456c7-firebase-adminsdk-jan27-bd6e6528c5.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;