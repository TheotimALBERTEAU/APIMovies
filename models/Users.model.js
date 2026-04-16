const mongoose = require('mongoose');

const { moviesConn} = require('../app');

const usersSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    pseudo: {
        type: String,
        required: true
    },
    profileSettings: {
        bannerColor: { type: String, default: '#5e0000' },
        profilePic: { type: String, default: '' }
    },
    progress: [{
        mediaId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'progress.mediaType'
        },
        mediaType: {
            type: String,
            required: true,
            enum: ['Movies', 'Series', 'Animes']
        },
        seasonNumber: Number,
        episodeNumber: Number,
        currentTime: Number,
        lastUpdated: { type: Date, default: Date.now }
    }],
    favorites: [
        {
            mediaId: { type: mongoose.Schema.Types.ObjectId, refPath: 'favorites.mediaType' },
            mediaType: { type: String, enum: ['Movies', 'Series', 'Animes'] },
            addedAt: { type: Date, default: Date.now }
        }
    ],
    viewingHistory: [{
        mediaId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'viewingHistory.mediaType'
        },
        mediaType: {
            type: String,
            required: true,
            enum: ['Movies', 'Series', 'Animes']
        },
        seasonNumber: Number,
        episodeNumber: Number,
        watchedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
}, {
    versionKey: false
});

module.exports = moviesConn.model('Users', usersSchema);
