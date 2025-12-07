const express = require('express');
const router = express.Router();
const { httpApiResponse } = require('../core/http-library');

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


