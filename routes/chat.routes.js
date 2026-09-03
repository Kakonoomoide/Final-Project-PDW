const express = require('express');
const router = express.Router();
const chat = require('../controllers/chat.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

/**
 * Endpoint fitur M5. Semuanya butuh login (`requireAuth`) karena tiap
 * user punya riwayat chat sendiri - tanpa tau siapa yang lagi ngobrol,
 * riwayatnya bakal ketuker antar user. Sekalian ngerem biar endpoint
 * AI-nya gak bisa dipanggil sembarangan sama orang luar.
 */

// Router ini dimount sebelum express.json() global (liat app.js), jadi
// parser JSON-nya dipasang sendiri di sini per-route.
const jsonTeks = express.json(); // default 100kb, cukup buat pesan teks
const jsonFoto = express.json({ limit: '8mb' }); // foto base64 jauh lebih gede

// `requireAuth` sengaja ditaruh SEBELUM parser: kalo user belum login,
// requestnya ditolak duluan tanpa perlu capek-capek parse body 8mb.
router.get('/history', requireAuth, chat.history);
router.delete('/history', requireAuth, chat.clearHistory);
router.post('/detect', requireAuth, jsonFoto, chat.detect);
router.post('/', requireAuth, jsonTeks, chat.sendMessage);

module.exports = router;
