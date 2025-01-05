const express = require('express');
const app = express();

app.get('/', (req, res) => {
  console.log("Richiesta ricevuta sulla route '/'");
  res.status(200).send('Server OK');
});

const port = 8080;

app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});

const functions = require('firebase-functions');

console.log("Funzione Firebase in esecuzione");

exports.api = functions.https.onRequest((req, res) => {
  console.log("Funzione Cloud Function chiamata");
  console.log("Metodo:", req.method);
  console.log("URL:", req.url);

  // Gestisci la richiesta con Express
  return app(req, res);
});