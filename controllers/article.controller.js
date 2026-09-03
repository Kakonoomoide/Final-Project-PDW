const articleService = require('../services/article.service');
const geminiService = require('../services/gemini.service');
const sendResponse = require('../utils/response');

/**
 * Controller CRUD artikel wisata + AI caption (M2).
 * Asalnya `news.controller.js`, dipetakan ke tema TrAvelIt.
 */

async function getAllArticles(req, res) {
  try {
    const articles = await articleService.getAllArticles();
    return sendResponse(res, { message: 'Data artikel berhasil diambil', data: articles });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function getArticleById(req, res) {
  try {
    const article = await articleService.getArticleById(req.params.id);
    if (!article) {
      return sendResponse(res, { code: 404, success: false, message: 'Artikel tidak ditemukan' });
    }
    return sendResponse(res, { message: 'Detail artikel berhasil diambil', data: article });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function createArticle(req, res) {
  try {
    const { title, caption, content, imageUrl } = req.body;

    if (!title || !content) {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: 'title dan content wajib diisi',
      });
    }

    const article = await articleService.createArticle({
      title: title.trim(),
      caption: caption ? caption.trim() : null,
      content: content.trim(),
      imageUrl: imageUrl ? imageUrl.trim() : null,
      createdBy: req.session.userId,
    });

    return sendResponse(res, { code: 201, message: 'Artikel berhasil dibuat', data: article });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function updateArticle(req, res) {
  try {
    const { title, caption, content, imageUrl } = req.body;

    if (!title || !content) {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: 'title dan content wajib diisi',
      });
    }

    const article = await articleService.updateArticle(req.params.id, {
      title: title.trim(),
      caption: caption ? caption.trim() : null,
      content: content.trim(),
      imageUrl: imageUrl ? imageUrl.trim() : null,
    });

    if (!article) {
      return sendResponse(res, { code: 404, success: false, message: 'Artikel tidak ditemukan' });
    }

    return sendResponse(res, { message: 'Artikel berhasil diperbarui', data: article });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function deleteArticle(req, res) {
  try {
    const article = await articleService.deleteArticle(req.params.id);
    if (!article) {
      return sendResponse(res, { code: 404, success: false, message: 'Artikel tidak ditemukan' });
    }
    return sendResponse(res, { message: 'Artikel berhasil dihapus' });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function generateCaption(req, res) {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: 'title dan content wajib diisi',
      });
    }

    const captions = await geminiService.generateCaption(title.trim(), content.trim());

    return sendResponse(res, { message: 'Caption berhasil dibuat oleh AI', data: captions });
  } catch (err) {
    console.error('[article] Generate caption gagal:', err.message);
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Gagal membuat caption dengan AI',
    });
  }
}

module.exports = {
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  generateCaption,
};
