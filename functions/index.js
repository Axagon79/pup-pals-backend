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

// Funzione Gemini (onCall)
exports.callGemini = functions.https.onCall(async (data, context) => {
  try {
    const configuredApp = await server(app);
    const geminiModel = configuredApp.get('geminiModel');

    if (!geminiModel) {
      throw new functions.https.HttpsError('failed-precondition', 'Gemini non è configurato');
    }

    const { systemPrompt, animalDetails, conversationHistory, question } = data;

    const result = await geminiModel.generateContent(systemPrompt); // Invia solo systemPrompt
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

      const { systemPrompt, animalDetails, conversationHistory, question } = req.body;

      const result = await geminiModel.generateContent(systemPrompt); // Invia solo systemPrompt
      res.json({ response: result.response.text() });
    } catch (error) {
      console.error('Errore in callGeminiHttp:', error);
      res.status(500).json({ error: error.message });
    }
  });
});