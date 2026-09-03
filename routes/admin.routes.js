const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

// `requireAdmin` (bukan `requireAdminPage`) karena ini endpoint API -
// yang dibutuhin JSON 401/403, bukan redirect ke halaman login.
router.get('/stats', requireAdmin, admin.stats);

module.exports = router;
