const express = require('express');
const router = express.Router();
const { httpApiResponse } = require('../core/http-library');
const { slugify } = require('../core/helpers-library');

const Series = require('../models/Series.model');

router.get('/', async (req, res) => {
    try {
        const series = await Series.find({}, {
            title: 1,
            year: 1,
            genre: 1,
            cover: 1,
            slug: 1,
            type: 1,
            seasons: 1
        }).sort({ _id: -1 });

        const formattedSeries = series.map(s => ({
            ...s.toObject(),
            seasons: s.seasons ? s.seasons.length : 0
        }));

        return httpApiResponse(res, "200", "Series list recovered", formattedSeries);
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

        const responseData = foundSerie.toObject();
        responseData.seasons = foundSerie.seasons ? foundSerie.seasons.length : 0;

        return httpApiResponse(res, "200", "Serie found", responseData);

    } catch (error) {
        return httpApiResponse(res, "500", "Error when finding serie", error);
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
            // AJOUT de _id: 1 ici pour être sûr de récupérer l'ID de la série
            { _id: 1, "seasons.$": 1, title: 1, casting: 1, year: 1, author: 1, genre: 1, cover: 1 }
        );

        if (!serie) return res.status(404).json({ message: "Série ou Saison non trouvée" });

        const foundEpisode = serie.seasons[0].episodes.find(e => e.episode === eNum);
        if (!foundEpisode) return res.status(404).json({ message: "Épisode non trouvé" });

        const globalCasting = serie.casting || [];
        const episodeCasting = foundEpisode.casting || [];
        const fullCasting = [...globalCasting, ...episodeCasting];

        const seenNames = new Set();
        const uniqueCasting = fullCasting.filter(actor => {
            if (!actor.name) return false;
            const nameKey = actor.name.trim().toLowerCase();
            if (seenNames.has(nameKey)) return false;
            seenNames.add(nameKey);
            return true;
        });

        const finalCasting = uniqueCasting.slice(0, 20);
        const { casting, _id, ...episodeData } = foundEpisode.toObject();

        res.json({
            code: "200",
            data: {
                _id: serie._id,
                serieTitle: serie.title,
                year: serie.year,
                casting: finalCasting,
                genre: serie.genre,
                author: serie.author,
                ...episodeData,
                cover: serie.cover
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