const express = require('express');
const router = express.Router();
const article = require('../controllers/article.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

/**
 * Endpoint artikel wisata (M2).
 *
 * Baca boleh siapa saja - landing page (M1) butuh nampilin artikel ke
 * pengunjung yang belum login. Tulis/ubah/hapus khusus admin.
 *
 * `/generate-caption` didaftarkan SEBELUM `/:id` supaya Express gak
 * nganggep "generate-caption" sebagai sebuah id.
 */
router.get('/', article.getAllArticles);
router.post('/generate-caption', requireAdmin, article.generateCaption);
router.get('/:id', article.getArticleById);
router.post('/', requireAdmin, article.createArticle);
router.put('/:id', requireAdmin, article.updateArticle);
router.delete('/:id', requireAdmin, article.deleteArticle);

module.exports = router;
