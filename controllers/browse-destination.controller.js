const browseService = require('../services/browse-destination.service');
const sendResponse = require('../utils/response');

/**
 * Controller AI destination finder / quiz rekomendasi (M3).
 * Asalnya `browse-product.controller.js`, dipetakan ke tema TrAvelIt.
 *
 * Katalog destinasinya diambil di dalam service, bukan dilempar dari
 * sini - versi aslinya sempat ngambil produk dua kali (sekali di
 * controller, sekali lagi di service) padahal yang kepake cuma satu.
 */
async function findDestinations(req, res) {
  try {
    const result = await browseService.getRecommendations(req.body);

    if (!result.success) {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: result.message || 'Gagal memproses rekomendasi destinasi',
      });
    }

    return sendResponse(res, {
      message: 'Rekomendasi destinasi berhasil didapatkan',
      data: result.data,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Terjadi kesalahan saat memproses rekomendasi',
    });
  }
}

module.exports = { findDestinations };
