const recommendationService = require('../services/browse-product.service');
const productService = require('../services/product.service'); // Memakai service yang sudah dibuat di M4
const sendResponse = require('../utils/response');

/**
 * Controller Product Finder / Rekomendasi Quiz (Jobdesk M3)
 */
async function findProducts(req, res) {
  try {
    const quizAnswers = req.body;

    // Ambil seluruh produk dari DB menggunakan service M4
    const allProducts = await productService.getAllProducts();

    // Olah dengan AI / Fallback milik M3
    const result = await recommendationService.getRecommendations(quizAnswers, allProducts);

    if (!result.success) {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: result.message || 'Gagal memproses rekomendasi produk',
      });
    }

    return sendResponse(res, {
      code: 200,
      message: 'Rekomendasi produk berhasil didapatkan',
      data: result.data,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Terjadi kesalahan sistem saat memproses rekomendasi',
    });
  }
}

module.exports = {
  findProducts,
};