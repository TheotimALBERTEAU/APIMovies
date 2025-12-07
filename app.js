const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

const moviesRoutes = require('./movies/movies-routes');

app.use('/movies', moviesRoutes);

app.listen(3000, () => {
    console.log('Server started on port 3000');
});