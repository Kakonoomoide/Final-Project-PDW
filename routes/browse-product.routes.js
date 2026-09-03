const express = require('express');
const router = express.Router();
const { findProducts } = require('../controllers/browse-product.controller');

router.post('/product-finder', findProducts);

module.exports = router;