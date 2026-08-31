const newsService = require('../services/news.service');
const geminiService = require('../services/gemini.service');
const sendResponse = require('../utils/response');

async function getAllNews(req, res) {
  try {
    const news = await newsService.getAllNews();

    return sendResponse(res, {
      code: 200,
      success: true,
      message: 'Data berita berhasil diambil',
      data: news,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message,
    });
  }
}

async function getNewsById(req, res) {
  try {
    const { id } = req.params;

    const news = await newsService.getNewsById(id);

    if (!news) {
      return sendResponse(res, {
        code: 404,
        success: false,
        message: 'Berita tidak ditemukan',
      });
    }

    return sendResponse(res, {
      code: 200,
      success: true,
      message: 'Detail berita berhasil diambil',
      data: news,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message,
    });
  }
}

async function createNews(req, res) {
  try {
    const { title, caption, content, imageUrl } = req.body;

    if (!title || !content) {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: 'title dan content wajib diisi',
      });
    }

    const news = await newsService.createNews({
      title: title.trim(),
      caption: caption ? caption.trim() : null,
      content: content.trim(),
      imageUrl: imageUrl ? imageUrl.trim() : null,
      createdBy: req.session.userId,
    });

    return sendResponse(res, {
      code: 201,
      success: true,
      message: 'Berita berhasil dibuat',
      data: news,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message,
    });
  }
}

async function updateNews(req, res) {
  try {
    const { id } = req.params;
    const { title, caption, content, imageUrl } = req.body;

    if (!title || !content) {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: 'title dan content wajib diisi',
      });
    }

    const news = await newsService.updateNews(id, {
      title: title.trim(),
      caption: caption ? caption.trim() : null,
      content: content.trim(),
      imageUrl: imageUrl ? imageUrl.trim() : null,
    });

    if (!news) {
      return sendResponse(res, {
        code: 404,
        success: false,
        message: 'Berita tidak ditemukan',
      });
    }

    return sendResponse(res, {
      code: 200,
      success: true,
      message: 'Berita berhasil diperbarui',
      data: news,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message,
    });
  }
}

async function deleteNews(req, res) {
  try {
    const { id } = req.params;

    const news = await newsService.deleteNews(id);

    if (!news) {
      return sendResponse(res, {
        code: 404,
        success: false,
        message: 'Berita tidak ditemukan',
      });
    }

    return sendResponse(res, {
      code: 200,
      success: true,
      message: 'Berita berhasil dihapus',
      data: null,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message,
    });
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

    const captions = await geminiService.generateCaption(
      title.trim(),
      content.trim()
    );

    return sendResponse(res, {
      code: 200,
      success: true,
      message: 'Caption berhasil dibuat oleh AI',
      data: captions,
    });
  } catch (err) {
    console.error('Generate caption error:', err);

    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Gagal membuat caption dengan AI',
    });
  }
}

module.exports = {
  getAllNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  generateCaption,
};