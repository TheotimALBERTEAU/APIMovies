const mongoose = require('mongoose');
const { moviesConn } = require('../app');

const actorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        unique: true,
        required: true
    },
    gender: {
        type: String,
        enum: ['homme', 'femme'],
        required: true
    },
    birthdate: {
        type: Date
    },
    profile_picture: {
        type: String
    },
    biography: {
        type: String
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = moviesConn.model('Actors', actorSchema);