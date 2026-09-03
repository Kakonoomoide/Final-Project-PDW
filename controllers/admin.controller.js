const { User, Trip, Destination, Article } = require('../models');
const sendResponse = require('../utils/response');

/**
 * Statistik ringkas buat dashboard admin.
 *
 * Sengaja HANYA hitungan (COUNT). Admin di aplikasi ini perannya kurator
 * konten - ngelola katalog destinasi & artikel - bukan pengawas isi
 * perjalanan orang. Trip punya user gak boleh diintip isinya, termasuk
 * tujuannya. Makanya di sini gak ada satu pun query yang balikin baris
 * trip, cuma jumlahnya.
 */
async function stats(req, res) {
  try {
    const [totalUser, totalTrip, totalDestinasi, totalArtikel] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      Trip.count(),
      Destination.count(),
      Article.count(),
    ]);

    return sendResponse(res, {
      data: { totalUser, totalTrip, totalDestinasi, totalArtikel },
    });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

module.exports = { stats };
