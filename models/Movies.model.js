const mongoose = require('mongoose')

const { moviesConn} = require('../app');
const { slugify } = require('../core/helpers-library');

const moviesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre est obligatoire.'],
        unique: true,
        trim: true,
    },
    year: {
        type: Number,
        required: [true, "L'année de sortie est obligatoire."],
        min: 1900,
        max: new Date().getFullYear(),
    },
    author: {
        type: String,
        required: [true, "L'auteur (réalisateur) est obligatoire."],
        trim: true,
    },
    duration: {
        type: Number,
        required: true,
        min: 1,
    },
    genre: {
        type: String,
        required: true,
        trim: true,
    },
    synopsis: {
        type: String,
        required: true,
        maxlength: 1000,
    },
    cover: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
    },
    trailer: {
        type: String,
    },
    link: {
        type: String,
        trim: true,
        unique: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true, // Garanti qu'il n'y a pas deux slugs identiques
        lowercase: true
    },
}, {
    timestamps: true
});

moviesSchema.pre('save', function(next) {
    // Si le titre a été modifié (ou s'il s'agit d'une nouvelle création)
    if (this.isModified('title') || this.isNew) {
        // Génère le slug et l'affecte au champ slug
        this.slug = slugify(this.title);
    }
    next();
});

module.exports = moviesConn.model('Movies', moviesSchema);
