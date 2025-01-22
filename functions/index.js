const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const server = require('./server');
const notificationFunctions = require('./notificationFunctions');


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

      const { systemPrompt } = req.body;

      // Validazione base
      if (!systemPrompt || typeof systemPrompt !== 'string') {
        res.status(400).json({ error: 'Il campo systemPrompt è richiesto e deve essere una stringa.' });
        return;
      }

      console.log('Elaborazione prompt:', systemPrompt); // Per debug

      const result = await geminiModel.generateContent(systemPrompt);
      
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

// Funzione per inviare notifiche
exports.sendNotification = notificationFunctions.sendNotification;