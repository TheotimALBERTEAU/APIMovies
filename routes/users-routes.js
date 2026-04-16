const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { httpApiResponse } = require('../core/http-library');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Users = require('../models/Users.model');
const Series = require('../models/Series.model');
const Movies = require('../models/Movies.model');
const Animes = require('../models/Animes.model');

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
        const { userId, mediaId, mediaType, currentTime } = request.body;

        // On gère les valeurs nulles pour les films pour éviter le NaN
        const seasonNumber = request.body.seasonNumber ? parseInt(request.body.seasonNumber) : null;
        const episodeNumber = request.body.episodeNumber ? parseInt(request.body.episodeNumber) : null;
        const cTime = parseFloat(currentTime);

        const uId = new mongoose.Types.ObjectId(userId);
        const mId = new mongoose.Types.ObjectId(mediaId);

        let durationMinutes = 0;

        // 1. Récupération de la durée
        if (mediaType === 'Series') {
            const seriesDoc = await Series.findById(mId);
            if (seriesDoc && seriesDoc.seasons) {
                const seasonDoc = seriesDoc.seasons.find(s => s.season == seasonNumber);
                const ep = seasonDoc?.episodes.find(e => e.episode == episodeNumber);
                if (ep) durationMinutes = parseFloat(ep.duration);
            }
        } else if (mediaType === 'Animes') {
            const animesDoc = await Animes.findById(mId);
            if (animesDoc && animesDoc.seasons) {
                const seasonDoc = animesDoc.seasons.find(s => s.season == seasonNumber);
                const ep = seasonDoc?.episodes.find(e => e.episode == episodeNumber);
                if (ep) durationMinutes = parseFloat(ep.duration);
            }
        } else {
            const movie = await Movies.findById(mId);
            durationMinutes = movie ? parseFloat(movie.duration) : 0;
        }

        const totalDurationSeconds = durationMinutes * 60;
        const threshold = totalDurationSeconds * 0.95;

        console.log(`Vérification : ${cTime}s / ${totalDurationSeconds}s (Seuil: ${threshold}s)`);

        // 2. CONDITION DE SUPPRESSION (Seuil 95% ou Reset)
        if ((totalDurationSeconds > 0 && cTime >= threshold) || cTime <= 0) {
            await Users.updateOne(
                { _id: uId },
                { $pull: { progress: { mediaId: mId, seasonNumber, episodeNumber } } }
            );
            return httpApiResponse(response, "200", "Nettoyé", null);
        }

        // 3. MISE À JOUR OU AJOUT
        // On construit la requête dynamiquement pour éviter les NaN/Null dans l'indexation
        const query = {
            _id: uId,
            "progress.mediaId": mId,
            "progress.seasonNumber": seasonNumber,
            "progress.episodeNumber": episodeNumber
        };

        const userProgressExists = await Users.findOne(query);

        if (userProgressExists) {
            await Users.updateOne(
                query,
                { $set: { "progress.$.currentTime": cTime, "progress.$.lastUpdated": new Date() } }
            );
        } else {
            await Users.updateOne(
                { _id: uId },
                {
                    $push: {
                        progress: {
                            mediaId: mId,
                            mediaType,
                            seasonNumber,
                            episodeNumber,
                            currentTime: cTime,
                            lastUpdated: new Date()
                        }
                    }
                }
            );
        }

        return httpApiResponse(response, "200", "Succès", null);
    } catch (error) {
        console.error("Erreur critique update-progress:", error);
        return httpApiResponse(response, "500", "Erreur serveur", null);
    }
});

router.get('/show-progress/:userId', async (request, response) => {
    try {
        const { userId } = request.params;

        const user = await Users.findById(userId)
            .select('progress')
            .populate('progress.mediaId');

        if (!user) {
            return httpApiResponse(response, "404", "Utilisateur non trouvé", null);
        }

        const enrichedProgress = user.progress
            .filter(item => item.mediaId !== null)
            .map(item => {
                const media = item.mediaId.toObject();
                const prog = item.toObject();

                if (media.seasons && prog.mediaType === 'Series' || prog.mediaType === 'Animes') {
                    const season = media.seasons.find(s => s.season === prog.seasonNumber);
                    if (season) {
                        const episode = season.episodes.find(e => e.episode === prog.episodeNumber);
                        if (episode) {
                            const fullCasting = [...(media.casting || []), ...(episode.casting || [])];
                            const seenNames = new Set();
                            const uniqueCasting = fullCasting.filter(actor => {
                                if (!actor.name) return false;
                                const nameKey = actor.name.trim().toLowerCase();
                                if (seenNames.has(nameKey)) return false;
                                seenNames.add(nameKey);
                                return true;
                            });

                            return {
                                ...prog,
                                mediaId: {
                                    _id: media._id,
                                    title: media.title,
                                    episodeTitle: episode.title,
                                    cover: episode.cover,
                                    slug: media.slug,
                                    type: media.type,
                                    duration: episode.duration,
                                    genre: media.genre,
                                    casting: uniqueCasting.slice(0, 10),
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

router.post('/toggle-favorite', async (req, res) => {
    const { userId, mediaId, mediaType } = req.body;

    const user = await Users.findById(userId);
    const index = user.favorites.findIndex(f => f.mediaId.toString() === mediaId);

    if (index > -1) {
        user.favorites.splice(index, 1); // Remove
        await user.save();
        return res.json({ message: "Retiré des favoris", isFavorite: false });
    } else {
        user.favorites.push({ mediaId, mediaType }); // Add
        await user.save();
        return res.json({ message: "Ajouté aux favoris", isFavorite: true });
    }
});

router.get('/profile/:id', async (req, res) => {
    try {
        const user = await Users.findById(req.params.id);
        if (!user) return res.status(404).json({ code: 404, message: "Utilisateur non trouvé" });

        res.json({
            code: 200,
            data: user
        });
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

router.get('/favorites/:userId', async (req, res) => {
    try {
        const user = await Users.findById(req.params.userId)
            .populate({
                path: 'favorites.mediaId',
                select: 'slug'
            });

        if (!user) return res.status(404).json({ code: 404, message: "Utilisateur non trouvé" });
        const simplifiedFavorites = user.favorites.map(fav => ({
            id: fav.mediaId?._id,
            slug: fav.mediaId?.slug
        }));

        res.json({
            code: 200,
            data: simplifiedFavorites
        });
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

module.exports = router;
