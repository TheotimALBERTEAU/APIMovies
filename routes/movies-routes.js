const express = require('express');
const router = express.Router();
const { httpApiResponse } = require('../core/http-library');
const { slugify } = require('../core/helpers-library');

const Movies = require('../models/Movies.model');

router.get('/', async (request, response) => {
    try {
        const movies = await Movies.find()
            .sort({ _id: -1 });
        
        return httpApiResponse(response, "200", "Movies list recovered", movies);
    } catch (error) {
        console.error("Error when recovering movies", error);
        return httpApiResponse(response, "500", "Server Error when movies recovering", null);
    }
});

router.get('/view/:slug', async (request, response) => {
    const rawSlug = request.params.slug;

    // 1. Convertir l'entrée de l'URL en slug standard
    const standardizedSlug = slugify(rawSlug);

    try {
        // 2. Rechercher par le champ 'slug' de la base de données
        const foundMovie = await Movies.findOne({ slug: standardizedSlug });

        if (!foundMovie) {
            return httpApiResponse(response, "404", "Movie not found", null);
        }

        return httpApiResponse(response, "200", "Movie found", foundMovie);

    } catch (error) {
        return httpApiResponse(response, "500", "Server Error when movies recovering", error);
    }
});

router.get('/search', async (req, res) => {
    const searchTerm = req.query.q;

    try {
        const movies = await Movies.find({
            title: { $regex: searchTerm, $options: 'i' }
        }).limit(10);

        res.json({ code: "200", data: movies });
    } catch (err) {
        res.json({ code: "500", message: err.message });
    }
});

router.get('/:genre', async (req, res) => {
    try {
        const genreParam = req.params.genre;

        const movies = await Movies.find({
            genre: { $regex: new RegExp("^" + genreParam + "$", "i") }
        }).sort({ _id: -1 });

        res.status(200).json({
            code: "200",
            message: `Movies from genre : ${genreParam} found`,
            data: movies
        });
    } catch (error) {
        res.status(500).json({
            code: "500",
            message: error.message
        });
    }
});

module.exports = router;


