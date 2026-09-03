const express = require('express');
const router = express.Router();
const page = require('../controllers/page.controller');
const { requireAdminPage } = require('../middlewares/auth.middleware');

router.get('/', requireAdminPage, page.adminDashboard);
router.get('/artikel', requireAdminPage, page.adminArticlesPage); // M2
router.get('/destinasi', requireAdminPage, page.adminDestinationsPage); // M4

module.exports = router;
