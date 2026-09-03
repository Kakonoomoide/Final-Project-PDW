const express = require('express');
const router = express.Router();
const { getWeatherByCity } = require('../controllers/weather.controller');

/**
 * Dimount di /api/weather (M1). Publik - landing page dilihat
 * pengunjung yang belum login.
 */
router.get('/', getWeatherByCity);

module.exports = router;
