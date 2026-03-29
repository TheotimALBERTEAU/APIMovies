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
    progress: [{
        movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movies' },
        currentTime: Number,
        lastUpdated: { type: Date, default: Date.now }
    }],
}, {
    timestamps: true
}, {
    versionKey: false
});

module.exports = moviesConn.model('Users', usersSchema);
