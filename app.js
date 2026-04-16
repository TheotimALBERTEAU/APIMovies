const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// 1. CHARGEMENT DES VARIABLES D'ENVIRONNEMENT
dotenv.config();

const app = express();
const MONGODB_URI = process.env.MONGODB_URI;

// Vérification immédiate de la présence de l'URI
if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is missing');
    process.exit(1);
}

// 2. CONFIGURATION DES MIDDLEWARES GLOBAUX
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Analyseurs de corps de requête et de cookies
app.use(express.json());
app.use(cookieParser());

// Empêcher la mise en cache pour les routes d'authentification
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// 3. CONNEXION À LA BASE DE DONNÉES
const connectionOptions = {
    retryWrites: true,
    w: 'majority'
};

const moviesConn = mongoose.createConnection(MONGODB_URI + 'Movies', connectionOptions);

moviesConn.on('connected', () => console.log('DB Connected to Movies collection'));
moviesConn.on('error', (err) => console.log('DB connexion error:', err.message));

// Export de la connexion pour les modèles
module.exports.moviesConn = moviesConn;

// 4. DÉFINITION DES ROUTES
const moviesRoutes = require('./routes/movies-routes');
const seriesRoutes = require('./routes/series-routes');
const animesRoutes = require('./routes/animes-routes');
const usersRoutes = require('./routes/users-routes');
const actorsRoutes = require('./routes/actors-routes');

app.use('/movies', moviesRoutes);
app.use('/series', seriesRoutes);
app.use('/animes', animesRoutes);
app.use('/users', usersRoutes);
app.use('/actors', actorsRoutes);

// 5. LANCEMENT DU SERVEUR
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});