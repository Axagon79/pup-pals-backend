require('dotenv').config({ path: '../.env' });

const { GoogleGenerativeAI } = require('@google/generative-ai');

const testGemini = async () => {
  console.log("Inizio test modulo Gemini...");
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("Errore: la variabile d'ambiente GEMINI_API_KEY non è impostata.");
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = "Scrivi una breve poesia sui pesci.";
    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text();

    console.log("Risposta Gemini:");
    console.log(responseText);
    console.log("Test modulo Gemini completato con successo.");
  } catch (error) {
    console.error("Errore durante il test del modulo Gemini:", error);
  }
};

testGemini();