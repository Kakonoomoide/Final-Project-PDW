const express = require('express');
const router = express.Router();
const destination = require('../controllers/destination.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

/**
 * Endpoint katalog destinasi wisata (M4).
 *
 * Baca boleh siapa saja - halaman browse (M3) dan landing page (M1)
 * butuh katalog ini tanpa login. Tulis/ubah/hapus khusus admin.
 *
 * `/stats` dan `/ai-description` didaftarkan SEBELUM `/:id` supaya
 * Express gak nganggep keduanya sebagai id.
 */
router.get('/', destination.getAll);
router.get('/stats', destination.getStats);
router.post('/ai-description', requireAdmin, destination.generateDescription);
router.get('/:id', destination.getById);
router.post('/', requireAdmin, destination.create);
router.put('/:id', requireAdmin, destination.update);
router.delete('/:id', requireAdmin, destination.remove);

module.exports = router;
