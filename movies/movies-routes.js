const express = require('express');
const router = express.Router();
const { httpApiResponse } = require('../core/http-library');
const { slugify } = require('../core/helpers-library');

const Movies = require('../models/Movies.model');

router.get('/', async (request, response) => {
    try {
        const movies = await Movies.find();
        
        return httpApiResponse(response, "200", "Movies list recovered", movies);
    } catch (error) {
        console.error("Error when recovering movies", error);
        return httpApiResponse(response, "500", "Server Error when movies recovering", null);
    }
});

router.get('/:slug', async (request, response) => {
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
        // ...
    }
});

module.exports = router;


