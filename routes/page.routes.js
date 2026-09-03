const express = require('express');
const router = express.Router();
const page = require('../controllers/page.controller');

router.get('/', page.landingPage); // M1
router.get('/login', page.loginPage);
router.get('/register', page.registerPage);
router.get('/destinasi', page.destinationsPage); // M3
router.get('/planner', page.plannerPage); // M5

/**
 * Satu file HTML dipakai buat semua id trip. Id-nya dibaca di browser
 * dari location.pathname, terus dipake manggil GET /api/trips/:id.
 *
 * Otorisasinya ada di API, BUKAN di rute halaman ini - halaman kosong
 * tanpa data gak ngebocorin apa-apa, dan API-nya bakal bales 404 kalau
 * trip itu bukan punya yang lagi login.
 */
router.get('/trip/:id', page.tripDetailPage); // M5

router.get('/chat', page.chatPage); // M5

module.exports = router;
