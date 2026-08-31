const express = require('express');
const router = express.Router();

const newsController = require('../controllers/news.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', newsController.getAllNews);

router.get('/:id', newsController.getNewsById);

router.post('/generate-caption', requireAdmin, newsController.generateCaption);

router.post('/', requireAdmin, newsController.createNews);

router.put('/:id', requireAdmin, newsController.updateNews);

router.delete('/:id', requireAdmin, newsController.deleteNews);

module.exports = router;