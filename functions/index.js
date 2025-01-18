const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const server = require('./server');

const app = express();

// Configurazione CORS
const corsConfig = {
  origin: ['https://pup-pals.vercel.app', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// API principale
exports.api = functions.https.onRequest(async (req, res) => {
  cors(corsConfig)(req, res, async () => {
    try {
      const configuredApp = await server(app);
      return configuredApp(req, res);
    } catch (error) {
      console.error('Errore nella funzione api:', error);
      res.status(500).json({ error: 'Errore interno del server' });
    }
  });
});

exports.callGemini = functions.https.onCall(async (data, context) => {
  try {
    const configuredApp = await server(app);
    const geminiModel = configuredApp.get('geminiModel');

    if (!geminiModel) {
      throw new functions.https.HttpsError('failed-precondition', 'Gemini non è configurato');
    }

    const { systemPrompt, animalDetails, conversationHistory, question } = data;

    // Validazione dei dati
    if (!systemPrompt || typeof systemPrompt !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Il campo systemPrompt è richiesto e deve essere una stringa.');
    }

    if (!animalDetails || typeof animalDetails !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Il campo animalDetails è richiesto e deve essere un oggetto.');
    }

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      throw new functions.https.HttpsError('invalid-argument', 'Il campo conversationHistory è richiesto e deve essere un array.');
    }

    // Costruisci il prompt completo
    const fullPrompt = `
      Informazioni sull'animale:
      ${JSON.stringify(animalDetails, null, 2)}

      Cronologia della conversazione:
      ${conversationHistory.join('\n')}

      Domanda dell'utente:
      ${systemPrompt}
    `;

    // Genera la risposta dal modello
    const result = await geminiModel.generateContent(fullPrompt);

    // Restituisci la risposta
    return { response: result.response.text() };
  } catch (error) {
    console.error('Errore in callGemini:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Endpoint specifico per Gemini con CORS (onRequest)
exports.callGeminiHttp = functions.https.onRequest(async (req, res) => {
  cors(corsConfig)(req, res, async () => {
    try {
      const configuredApp = await server(app);
      const geminiModel = configuredApp.get('geminiModel');

      if (!geminiModel) {
        res.status(500).json({ error: 'Assistente virtuale non disponibile.' });
        return;
      }

      const { systemPrompt, animalDetails, conversationHistory } = req.body;

      // Costruisci il prompt completo includendo conversationHistory
      const fullPrompt = `
        Informazioni sull'animale:
        ${JSON.stringify(animalDetails, null, 2)}

        Cronologia della conversazione:
        ${conversationHistory ? conversationHistory.join('\n') : ''}

        Prompt dell'utente:
        ${systemPrompt}
      `;

      const result = await geminiModel.generateContent(fullPrompt);
      res.json({ response: result.response.text() });
    } catch (error) {
      console.error('Errore in callGeminiHttp:', error);
      res.status(500).json({ error: error.message });
    }
  });
});