const express = require('express');
const router = express.Router();
const { findDestinations } = require('../controllers/browse-destination.controller');

// Dimount di /api/ai, jadi path lengkapnya /api/ai/destination-finder
router.post('/destination-finder', findDestinations);

module.exports = router;
