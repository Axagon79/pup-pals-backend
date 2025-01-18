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

      // Validazione dei dati
      if (!systemPrompt || typeof systemPrompt !== 'string') {
        res.status(400).json({ error: 'Il campo systemPrompt è richiesto e deve essere una stringa.' });
        return;
      }

      // Validazione più flessibile per animalDetails
      if (animalDetails && typeof animalDetails !== 'string') {
        res.status(400).json({ error: 'Il campo animalDetails deve essere una stringa.' });
        return;
      }

      // Validazione più flessibile per conversationHistory
      const validConversationHistory = Array.isArray(conversationHistory) ? conversationHistory : [];

      // Costruisci il prompt completo
      const fullPrompt = `
        ${animalDetails ? `Informazioni sull'animale:
        ${animalDetails}` : ''}

        ${validConversationHistory.length > 0 ? `Cronologia della conversazione:
        ${validConversationHistory.map(entry => `${entry.role}: ${entry.content}`).join('\n')}` : ''}

        Prompt dell'utente:
        ${systemPrompt}
      `.trim();

      console.log('Elaborazione prompt:', fullPrompt); // Per debug

      const result = await geminiModel.generateContent(fullPrompt);
      
      if (!result || !result.response) {
        throw new Error('Risposta non valida dal modello Gemini');
      }

      res.json({ 
        response: result.response.text(),
        success: true
      });

    } catch (error) {
      console.error('Errore dettagliato in callGeminiHttp:', error);
      res.status(500).json({ 
        error: 'Errore durante l\'elaborazione della richiesta',
        details: error.message,
        success: false
      });
    }
  });
});