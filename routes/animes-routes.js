const express = require('express');
const router = express.Router();
const { httpApiResponse } = require('../core/http-library');
const { slugify } = require('../core/helpers-library');

const Animes = require('../models/Animes.model');

router.get('/', async (req, res) => {
    try {
        const animes = await Animes.find({}, {
            title: 1,
            year: 1,
            genre: 1,
            cover: 1,
            slug: 1,
            type: 1,
            seasons: 1
        }).sort({ _id: -1 });

        const formattedAnimes = animes.map(s => ({
            ...s.toObject(),
            seasons: s.seasons ? s.seasons.length : 0
        }));

        return httpApiResponse(res, "200", "Animes list recovered", formattedAnimes);
    } catch (error) {
        console.error("Error when recovering animes", error);
        return httpApiResponse(res, "500", "Server Error when animes recovering", null);
    }
});

router.get('/search', async (req, res) => {
    const searchTerm = req.query.q;

    try {
        const animes = await Animes.find({
            title: { $regex: searchTerm, $options: 'i' }
        }).limit(10);

        res.json({ code: "200", data: animes });
    } catch (err) {
        res.json({ code: "500", message: err.message });
    }
});

router.get('/view/:slug', async (req, res) => {
    const slug = req.params.slug;

    try {
        const foundAnime = await Animes.findOne({ slug: slug });

        if (!foundAnime) {
            return httpApiResponse(res, "404", "Anime not found", null);
        }

        const responseData = foundAnime.toObject();
        responseData.seasons = foundAnime.seasons ? foundAnime.seasons.length : 0;

        return httpApiResponse(res, "200", "Anime found", responseData);

    } catch (error) {
        return httpApiResponse(res, "500", "Error when finding anime", error);
    }
});

router.get('/view/:slug/:season', async (req, res) => {
    try {
        const { slug, season } = req.params;
        const anime = await Animes.findOne(
            { slug: slug, "seasons.season": parseInt(season) },
            { "seasons.$": 1, title: 1 }
        );

        if (!anime) return httpApiResponse(res, "404", "Season not found", null);
        return httpApiResponse(res, "200", "Season found", anime.seasons[0]);
    } catch (error) {
        return httpApiResponse(res, "500", "Error", error);
    }
});

router.get('/view/:slug/:season/:episode', async (req, res) => {
    try {
        const { slug, season, episode } = req.params;
        const sNum = parseInt(season);
        const eNum = parseInt(episode);

        const anime = await Animes.findOne(
            { slug: slug },
            { _id: 1, seasons: 1, title: 1, casting: 1, year: 1, author: 1, genre: 1, cover: 1, slug: 1 }
        );

        if (!anime) return res.status(404).json({ message: "Série non trouvée" });

        const foundSeason = anime.seasons.find(s => s.season === sNum);
        if (!foundSeason) return res.status(404).json({ message: "Saison non trouvée" });

        const foundEpisode = foundSeason.episodes.find(e => e.episode === eNum);
        if (!foundEpisode) return res.status(404).json({ message: "Épisode non trouvé" });

        const globalCasting = anime.casting || [];
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

        const { casting, _id, ...episodeData } = foundEpisode.toObject();

        res.json({
            code: "200",
            data: {
                _id: anime._id,
                animeTitle: anime.title,
                year: anime.year,
                casting: uniqueCasting.slice(0, 20),
                genre: anime.genre,
                author: anime.author,
                slug: anime.slug,
                ...episodeData,
                cover: anime.cover,
                totalSeasons: anime.seasons.length
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:genre', async (req, res) => {
    try {
        const genreParam = req.params.genre;

        const animes = await Animes.find({
            genre: { $regex: new RegExp("^" + genreParam + "$", "i") }
        }).sort({ _id: -1 });

        res.status(200).json({
            code: "200",
            message: `Animes from genre : ${genreParam} found`,
            data: animes
        });
    } catch (error) {
        res.status(500).json({
            code: "500",
            message: error.message
        });
    }
});

module.exports = router;