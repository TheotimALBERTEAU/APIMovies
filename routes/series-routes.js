const express = require('express');
const router = express.Router();
const { httpApiResponse } = require('../core/http-library');
const { slugify } = require('../core/helpers-library');

const Series = require('../models/Series.model');

router.get('/', async (req, res) => {
    try {
        const series = await Series.find()
            .sort({_id: -1});

        return httpApiResponse(res, "200", "Series list recovered", series)
    } catch (error) {
        console.error("Error when recovering series", error);
        return httpApiResponse(res, "500", "Server Error when series recovering", null);
    }
});

router.get('/search', async (req, res) => {
    const searchTerm = req.query.q;

    try {
        const series = await Series.find({
            title: { $regex: searchTerm, $options: 'i' }
        }).limit(10);

        res.json({ code: "200", data: series });
    } catch (err) {
        res.json({ code: "500", message: err.message });
    }
});

router.get('/view/:slug', async (req, res) => {
    const slug = req.params.slug;

    try {
        const foundSerie = await Series.findOne({ slug: slug });

        if (!foundSerie) {
            return httpApiResponse(res, "404", "Serie not found", null);
        }

        return httpApiResponse(res, "200", "Serie found", foundSerie);

    } catch (error) {
        return httpApiResponse(res, "500", "Error when finding movie", error);
    }
});

router.get('/view/:slug/:season', async (req, res) => {
    try {
        const { slug, season } = req.params;
        const serie = await Series.findOne(
            { slug: slug, "seasons.season": parseInt(season) },
            { "seasons.$": 1, title: 1 }
        );

        if (!serie) return httpApiResponse(res, "404", "Season not found", null);
        return httpApiResponse(res, "200", "Season found", serie.seasons[0]);
    } catch (error) {
        return httpApiResponse(res, "500", "Error", error);
    }
});

router.get('/view/:slug/:season/:episode', async (req, res) => {
    try {
        const { slug, season, episode } = req.params;

        const sNum = parseInt(season);
        const eNum = parseInt(episode);

        const serie = await Series.findOne(
            { slug: slug, "seasons.season": sNum },
            { "seasons.$": 1, title: 1 }
        );

        if (!serie) return res.status(404).json({ message: "Série ou Saison non trouvée" });

        const foundEpisode = serie.seasons[0].episodes.find(e => e.episode === eNum);

        if (!foundEpisode) return res.status(404).json({ message: "Épisode non trouvé" });

        res.json({
            code: "200",
            data: {
                serieTitle: serie.title,
                ...foundEpisode.toObject()
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:genre', async (req, res) => {
    try {
        const genreParam = req.params.genre;

        const series = await Series.find({
            genre: { $regex: new RegExp("^" + genreParam + "$", "i") }
        }).sort({ _id: -1 });

        res.status(200).json({
            code: "200",
            message: `Series from genre : ${genreParam} found`,
            data: series
        });
    } catch (error) {
        res.status(500).json({
            code: "500",
            message: error.message
        });
    }
});

module.exports = router;