const mongoose = require('mongoose');
const { moviesConn } = require('../app'); // Utilisation de la même connexion si partagée
const { slugify } = require('../core/helpers-library');

const episodesSchema = new mongoose.Schema({
    episode: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    synopsis: { type: String },
    cover: { type: String },
    duration: { type: Number },
    link: { type: String, trim: true },
    rating: { type: Number, min: 0, max: 10, default: 0 },
    casting: [{
        name: String,
        slug: String,
    }]
});

const seasonsSchema = new mongoose.Schema({
    season: { type: Number, required: true },
    cover: { type: String },
    episodes: [episodesSchema]
});

const animesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre est obligatoire.'],
        unique: true,
        trim: true,
    },
    year: {
        type: Number,
        required: [true, "L'année de début est obligatoire."],
        min: 1900,
        max: new Date().getFullYear() + 5,
    },
    author: {
        type: String, // Créateur de la série
        trim: true,
    },
    genre: {
        type: [String],
        required: true,
    },
    synopsis: {
        type: String,
        required: true,
        maxlength: 2000,
    },
    cover: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
    },
    trailer: {
        type: String,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    type: {
        type: String,
        default: "Série"
    },
    casting: [{
        name: String,
        slug: String,
    }],
    seasons: [seasonsSchema]
}, {
    timestamps: true
});

// Middleware pour générer le slug avant la sauvegarde
animesSchema.pre('save', function(next) {
    if (this.isModified('title') || this.isNew) {
        this.slug = slugify(this.title);
    }
    next();
});

module.exports = moviesConn.model('Animes', animesSchema);