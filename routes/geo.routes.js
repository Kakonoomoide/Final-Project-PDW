const express = require('express');
const router = express.Router();
const geo = require('../controllers/geo.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Keduanya butuh login supaya endpoint ini gak jadi proxy geocoding
// gratis buat orang luar.
router.get('/reverse', requireAuth, geo.reverse); // koordinat -> nama kota
router.get('/search', requireAuth, geo.search); // nama tempat -> koordinat

module.exports = router;
