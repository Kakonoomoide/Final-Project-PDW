const express = require('express');
const router = express.Router();
const page = require('../controllers/page.controller');
const { requireAdminPage } = require('../middlewares/auth.middleware');

router.get('/', requireAdminPage, page.adminDashboard);
router.get('/news', requireAdminPage, page.adminNewsPage); // M2
router.get('/produk', requireAdminPage, page.adminProductsPage); // M4
router.get('/products', requireAdminPage, page.adminProductsPage); // Alias M4

module.exports = router;
