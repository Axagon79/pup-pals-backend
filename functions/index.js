const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
// Importa gli altri moduli necessari

// Inizializza express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importa le tue route
// const userRoutes = require("./routes/userRoutes");
// app.use("/api/users", userRoutes);
// ... altre route

// Connessione MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Esporta l'app come funzione Firebase
exports.api = onRequest(app);