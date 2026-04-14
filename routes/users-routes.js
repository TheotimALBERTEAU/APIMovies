const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { httpApiResponse } = require('../core/http-library');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Users = require('../models/Users.model');

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return httpApiResponse(res, "401", "Non connecté", null);
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return httpApiResponse(res, "403", "Session expirée", null);
        }
        req.user = user;
        next();
    });
};

router.post('/login', async (request, response) => {
    try {
        const { email, password } = request.body;

        const user = await Users.findOne({ email });
        if (!user) {
            return httpApiResponse(response, "401", "User introuvable", null);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return httpApiResponse(response, "402", "Identifiants invalides", null);
        }

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '5h' }
        );

        response.cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            maxAge: 18000000
        });

        return httpApiResponse(response, "200", "Connexion réussie", {
            id: user._id,
            email: user.email
        });
    } catch (error) {
        console.error("Error during connection", error);
        return httpApiResponse(response, "500", "Server Error during connection", error);
    }
});

router.get('/me', authenticateToken, (req, res) => {
    return httpApiResponse(res, "200", "Utilisateur authentifié", {
        id: req.user.id,
        email: req.user.email
    });
});

router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        path: '/'
    });
    return httpApiResponse(res, "200", "Déconnexion réussie", null);
});

router.post('/signup', async (request, response) => {
    try {
        const { email, password, passwordConfirm, pseudo } = request.body;

        // 1. Validation de la correspondance des mots de passe
        if (password !== passwordConfirm) {
            return httpApiResponse(response, "400", "Les mots de passe ne correspondent pas", null);
        }

        // 2. Vérification si l'utilisateur existe déjà
        const existingUser = await Users.findOne({ email });
        if (existingUser) {
            return httpApiResponse(response, "400", "Cet email est déjà utilisé", null);
        }

        // 3. Hachage du mot de passe (Salt round: 10)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Création et enregistrement
        const newUser = new Users({
            email,
            password: hashedPassword,
            pseudo
        });

        await newUser.save();

        return httpApiResponse(response, "201", "Utilisateur créé avec succès", {
            id: newUser._id,
            email: newUser.email,
            pseudo: newUser.pseudo
        });

    } catch (error) {
        console.error("Error during signup", error);
        return httpApiResponse(response, "500", "Server Error during signup", null);
    }
});

router.post('/update-progress', async (request, response) => {
    try {
        const { userId, mediaId, mediaType, seasonNumber, episodeNumber, currentTime } = request.body;

        const uId = new mongoose.Types.ObjectId(userId);
        const mId = new mongoose.Types.ObjectId(mediaId);

        const query = { _id: uId, "progress.mediaId": mId };
        const user = await Users.findOne(query);

        if (user) {
            await Users.updateOne(
                query,
                {
                    $set: {
                        "progress.$.currentTime": currentTime,
                        "progress.$.lastUpdated": new Date()
                    }
                }
            );
        } else {
            await Users.updateOne(
                { _id: uId },
                {
                    $push: {
                        progress: {
                            mediaId: mediaId,
                            mediaType: mediaType,
                            seasonNumber: seasonNumber,
                            episodeNumber: episodeNumber,
                            currentTime: currentTime,
                            lastUpdated: new Date()
                        }
                    }
                }
            );
        }
        return httpApiResponse(response, "200", "Succès", null);
    } catch (error) {
        return httpApiResponse(response, "500", "Erreur serveur", null);
    }
});

router.get('/show-progress/:userId', async (request, response) => {
    try {
        const { userId } = request.params;

        const user = await Users.findById(userId)
            .select('progress')
            // On populate mediaId sans filtre select pour avoir accès aux saisons et au casting global
            .populate('progress.mediaId');

        if (!user) {
            return httpApiResponse(response, "404", "Utilisateur non trouvé", null);
        }

        const enrichedProgress = user.progress
            .filter(item => item.mediaId !== null)
            .map(item => {
                const media = item.mediaId.toObject();
                const prog = item.toObject();

                // Si c'est une série, on extrait les infos de l'épisode précis
                if (prog.mediaType === 'Series' && media.seasons) {
                    const season = media.seasons.find(s => s.season === prog.seasonNumber);
                    if (season) {
                        const episode = season.episodes.find(e => e.episode === prog.episodeNumber);
                        if (episode) {
                            // Fusion du casting (Série + Épisode) comme dans ta route /view
                            const fullCasting = [...(media.casting || []), ...(episode.casting || [])];
                            const seenNames = new Set();
                            const uniqueCasting = fullCasting.filter(actor => {
                                if (!actor.name) return false;
                                const nameKey = actor.name.trim().toLowerCase();
                                if (seenNames.has(nameKey)) return false;
                                seenNames.add(nameKey);
                                return true;
                            });

                            // On remplace mediaId par un objet hybride contenant les infos de l'épisode
                            return {
                                ...prog,
                                mediaId: {
                                    _id: media._id,
                                    title: media.title, // "Loki"
                                    episodeTitle: episode.title, // "Un destin exceptionnel"
                                    cover: episode.cover,
                                    slug: media.slug,
                                    type: media.type,
                                    duration: episode.duration, // Durée de l'épisode et non de la série
                                    genre: media.genre,
                                    casting: uniqueCasting.slice(0, 10), // On limite pour le slider
                                    link: episode.link,
                                    episodeNumber: episode.episode,
                                    seasonNumber: season.season
                                }
                            };
                        }
                    }
                }
                return prog;
            });

        const sortedProgress = enrichedProgress.sort((a, b) =>
            new Date(b.lastUpdated) - new Date(a.lastUpdated)
        );

        return httpApiResponse(response, "200", "Progression récupérée", sortedProgress);
    } catch (error) {
        console.error("Error fetching progress", error);
        return httpApiResponse(response, "500", "Erreur lors de la récupération", null);
    }
});

module.exports = router;
