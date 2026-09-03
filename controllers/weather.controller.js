const weatherService = require('../services/weather.service');
const geminiService = require('../services/gemini.service');
const sendResponse = require('../utils/response');

/**
 * Controller cuaca kota tujuan + narasi AI waktu berkunjung (M1).
 * Menggabungkan data eksternal (OpenWeatherMap) dan narasi Gemini
 * dalam satu response, biar landing page cukup satu kali fetch.
 */
async function getWeatherByCity(req, res) {
  try {
    const city = String(req.query.city || '').trim();

    if (!city) {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: 'Nama kota tujuan wajib diisi',
      });
    }

    const weather = await weatherService.getCurrentWeather(city);

    // Kalau AI-nya gagal (kuota habis, dsb), widget cuaca tetap tampil -
    // cuma narasinya kosong. Sama seperti fallback di M3
    // (browse-destination.service.js).
    let rekomendasi = null;
    try {
      rekomendasi = await geminiService.narasiWaktuBerkunjung(weather);
    } catch (err) {
      console.warn('[weather] Narasi AI gagal, tampilkan cuaca tanpa narasi:', err.message);
    }

    return sendResponse(res, {
      message: 'Data cuaca berhasil diambil',
      data: { weather, rekomendasi },
    });
  } catch (err) {
    return sendResponse(res, {
      code: 502,
      success: false,
      message: err.message || 'Gagal mengambil data cuaca',
    });
  }
}

module.exports = { getWeatherByCity };
