const express = require('express');
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
        console.log(isMatch);
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
        const { userId, movieId, currentTime } = request.body;

        // CAS 1 : Si le temps est 0, on retire le film de la liste
        if (currentTime <= 0) {
            await Users.updateOne(
                { _id: userId },
                { $pull: { progress: { movieId: movieId } } }
            );
            return httpApiResponse(response, "200", "Progression réinitialisée et film retiré", null);
        }

        // CAS 2 : On cherche si le film existe déjà dans l'historique
        const user = await Users.findOne({ _id: userId, "progress.movieId": movieId });

        if (user) {
            // Mise à jour du temps pour un film déjà commencé
            await Users.updateOne(
                { _id: userId, "progress.movieId": movieId },
                {
                    $set: {
                        "progress.$.currentTime": currentTime,
                        "progress.$.lastUpdated": new Date()
                    }
                }
            );
        } else {
            // Ajout d'un nouveau film (seulement si currentTime > 0)
            await Users.updateOne(
                { _id: userId },
                {
                    $push: {
                        progress: { movieId, currentTime, lastUpdated: new Date() }
                    }
                }
            );
        }

        return httpApiResponse(response, "200", "Progression sauvegardée", null);
    } catch (error) {
        console.error("Erreur progression:", error);
        return httpApiResponse(response, "500", "Erreur serveur", null);
    }
});

router.get('/show-progress/:userId', async (request, response) => {
    try {
        const { userId } = request.params;

        const user = await Users.findById(userId)
            .select('progress')
            .populate('progress.movieId');

        if (!user) {
            return httpApiResponse(response, "404", "Utilisateur non trouvé", null);
        }

        return httpApiResponse(response, "200", "Liste des films récupérée", user.progress);
    } catch (error) {
        console.error("Error fetching progress", error);
        return httpApiResponse(response, "500", "Erreur lors de la récupération", null);
    }
});

module.exports = router;
