const path = require('path');
const serviceAccount = require('/etc/secrets/firebase-adminsdk.json');

const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;