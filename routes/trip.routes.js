const express = require('express');
const router = express.Router();
const trip = require('../controllers/trip.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

/**
 * Endpoint fitur M5 (perencana rute wisata). Semuanya butuh login
 * (`requireAuth`) karena tiap trip itu milik seseorang - tanpa tau siapa
 * yang lagi minta, trip antar user bakal ketuker. Sekalian ngerem biar
 * endpoint AI-nya gak bisa dipanggil sembarang orang dari luar.
 *
 * `/generate` sengaja ditaruh SEBELUM `/:id`, kalau kebalik Express
 * bakal nganggep "generate" itu sebuah id.
 */
router.post('/generate', requireAuth, trip.generate);
router.get('/', requireAuth, trip.list);
router.get('/:id', requireAuth, trip.detail);
router.get('/:id/versions', requireAuth, trip.versions);
router.patch('/:id', requireAuth, trip.update);
router.post('/:id/regenerate', requireAuth, trip.regenerate);
router.delete('/:id', requireAuth, trip.hapus);

module.exports = router;
