const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

/**
 * Routes untuk Bahan Pertanian (Jobdesk M4)
 */

// Public / User read endpoints (digunakan juga oleh M3)
router.get('/', productController.getAll);
router.get('/stats', productController.getStats);
router.get('/:id', productController.getById);

// Admin-only endpoints (CRUD M4 + AI Deskripsi)
router.post('/ai-description', requireAdmin, productController.generateDescription);
router.post('/', requireAdmin, productController.create);
router.put('/:id', requireAdmin, productController.update);
router.delete('/:id', requireAdmin, productController.remove);

module.exports = router;
