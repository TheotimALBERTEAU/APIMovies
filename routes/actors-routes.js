const express = require('express');
const router = express.Router();
const { httpApiResponse } = require('../core/http-library');
const { slugify } = require('../core/helpers-library');

const Actors = require('../models/Actors.model');

router.get('/', async (request, response) => {
    try {
        const actors = await Actors.find()
            .sort({ name: 1 });

        return httpApiResponse(response, "200", "Actors list recovered", actors);
    } catch (error) {
        console.error("Error when recovering actors", error);
        return httpApiResponse(response, "500", "Server Error when actors recovering", null);
    }
});

router.get('/:slug', async (request, response) => {
    const rawSlug = request.params.slug;
    try {
        const foundActor = await Actors.findOne({ slug: rawSlug });
        if (!foundActor) {
            return httpApiResponse(response, "404", "Actor not found", null);
        }

        return httpApiResponse(response, "200", "Actor found", foundActor);
    } catch (error) {
        console.error("Error when recovering Slug", error);
        httpApiResponse(response, "500", "Server Error when recovering Slug", error);
    }
})

module.exports = router;
