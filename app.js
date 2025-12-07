const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// charger variables d'environnement du fichier .env
dotenv.config();

const app = express();

// CONNEXION DB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable is missing');
    process.exit(1);
}

const connectionOptions = {
    retryWrites: true,
    w: 'majority'
};

const moviesConn = mongoose.createConnection(MONGODB_URI + 'Movies', connectionOptions);
moviesConn.on('connected', () => console.log('DB Connected'));
moviesConn.on('error', (err) => console.log('DB connexion error:', err.message));

module.exports.moviesConn = moviesConn;

app.use(express.json());
app.use(cors());

const moviesRoutes = require('./movies/movies-routes');

app.use('/movies', moviesRoutes);

app.listen(3000, () => {
    console.log('Server started on port 3000');
});