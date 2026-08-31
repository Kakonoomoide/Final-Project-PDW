const express = require('express');
const router = express.Router();
const page = require('../controllers/page.controller');

router.get('/', page.landingPage); // M1
router.get('/login', page.loginPage);
router.get('/register', page.registerPage);
router.get('/produk', page.userProductsPage); // M3
router.get('/chat', page.chatPage); // M5

module.exports = router;
