const express = require('express');
const router = express.Router();
const geo = require('../controllers/geo.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/reverse', requireAuth, geo.reverse);

module.exports = router;
