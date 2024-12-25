const path = require('path');
const serviceAccount = require(path.resolve('./config/firebase-adminsdk.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;