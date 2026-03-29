const express = require('express');
const router = express.Router();
const { httpApiResponse } = require('../core/http-library');
const bcrypt = require('bcrypt')

const Users = require('../models/Users.model');

router.post('/connection', async (request, response) => {
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

        return httpApiResponse(response, "200", "Connexion réussie", {
            id: user._id,
            email: user.email
        });
    } catch (error) {
        console.error("Error during connection", error);
        return httpApiResponse(response, "500", "Server Error during connection", error);
    }
});

router.post('/signup', async (request, response) => {
    try {
        const { email, password, passwordconfirm, pseudo } = request.body;

        // 1. Validation de la correspondance des mots de passe
        if (password !== passwordconfirm) {
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

        // On cherche l'utilisateur et on vérifie s'il a déjà ce film dans son historique
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
            // Ajout d'un nouveau film à la liste de lecture
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
        return httpApiResponse(response, "500", "Erreur serveur lors de la sauvegarde", null);
    }
});

router.get('/show-progress/:userId', async (request, response) => {
    try {
        const { userId } = request.params;

        // On récupère l'utilisateur et on ne sélectionne que le champ 'progress'
        const user = await Users.findById(userId).select('progress');

        if (!user) {
            return httpApiResponse(response, "404", "Utilisateur non trouvé", null);
        }

        // On extrait uniquement les IDs de films du tableau de progression
        const movieIds = user.progress.map(item => item.movieId);

        return httpApiResponse(response, "200", "Liste des films récupérée", movieIds);
    } catch (error) {
        console.error("Error fetching progress", error);
        return httpApiResponse(response, "500", "Erreur lors de la récupération", null);
    }
});

module.exports = router;
