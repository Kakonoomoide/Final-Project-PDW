const geo = require('../services/geo.service');
const sendResponse = require('../utils/response');

/**
 * Proxy reverse geocode buat tombol "pakai lokasi saya" (M5).
 *
 * Kenapa lewat server dan bukan browser manggil Nominatim langsung:
 * Nominatim minta maksimal 1 request/detik dan User-Agent yang jelas.
 * Kalau tiap browser manggil sendiri, dua aturan itu gak bisa ditegakkan
 * sama sekali, dan yang kena blokir IP-nya user. Lewat sini, antrian &
 * cache di services/geo.service.js tetep berlaku.
 *
 * Dipasangin `requireAuth` di routes-nya supaya endpoint ini gak jadi
 * proxy geocoding gratis buat orang luar.
 */
async function reverse(req, res) {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    const sah =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    if (!sah) {
      return sendResponse(res, { code: 400, success: false, message: 'Koordinat tidak valid' });
    }

    const hasil = await geo.reverseGeocode(lat, lng);
    if (!hasil) {
      return sendResponse(res, { code: 404, success: false, message: 'Lokasi tidak dikenali' });
    }

    return sendResponse(res, { data: hasil });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

/**
 * Nama tempat -> koordinat. Dipake tombol "cari koordinat" di form
 * kelola destinasi (M4), biar admin bisa ngecek dulu titiknya ketemu
 * atau nggak sebelum nyimpen.
 *
 * Alasan lewat server sama kayak `reverse` di atas: aturan 1 request per
 * detik & User-Agent Nominatim cuma bisa ditegakkan dari sini.
 */
async function search(req, res) {
  try {
    const q = String(req.query.q || '').trim();

    if (!q) {
      return sendResponse(res, { code: 400, success: false, message: 'Kata kunci pencarian kosong' });
    }
    if (q.length > 200) {
      return sendResponse(res, { code: 400, success: false, message: 'Kata kunci terlalu panjang' });
    }

    const hasil = await geo.geocode(q);
    if (!hasil) {
      return sendResponse(res, { code: 404, success: false, message: 'Lokasi tidak ditemukan di OpenStreetMap' });
    }

    return sendResponse(res, { data: hasil });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

module.exports = { reverse, search };
