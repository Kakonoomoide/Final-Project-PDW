const { Destination } = require('../models');
const gemini = require('./gemini.service');

/**
 * Logic halaman browse destinasi + AI destination finder (M3).
 *
 * Asalnya `browse-product.service.js` yang ditulis M3 buat tabel
 * `products`. Pola & fallback-nya dipertahankan, cuma dipetakan ke
 * destinasi wisata.
 */

const MAX_REKOMENDASI = 4;

async function getAllDestinations(query = {}) {
  const { category, city } = query;
  const where = {};

  if (category) where.category = category;
  if (city) where.city = city;

  const destinations = await Destination.findAll({ where, raw: true });
  return { success: true, destinations };
}

async function getDestinationById(id) {
  const destination = await Destination.findByPk(id, { raw: true });
  if (!destination) {
    return { success: false, message: 'Destinasi tidak ditemukan' };
  }
  return { success: true, destination };
}

/**
 * AI destination finder: jawaban quiz user dicocokkan ke katalog.
 *
 * Yang diminta ke Gemini cuma DAFTAR ID, bukan data destinasinya. Jadi
 * AI gak bisa ngarang destinasi yang gak ada di katalog - dia cuma
 * milih dari yang beneran kita punya. Data utuhnya diambil ulang dari
 * database berdasarkan id yang dia pilih.
 *
 * Kalau AI gagal (kuota habis, 503, dsb), fallback ke beberapa destinasi
 * pertama - halaman quiz tetep ngasih hasil, gak nampilin error.
 */
async function getRecommendations(quizAnswers) {
  const destinations = await Destination.findAll({ raw: true });

  if (!destinations || destinations.length === 0) {
    return { success: true, data: [] };
  }

  // Yang dikirim ke AI cuma kolom yang dia butuh buat mutusin - bukan
  // seluruh baris. Konteks lebih pendek, lebih murah, lebih cepat.
  const ringkas = destinations.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    city: d.city,
    province: d.province,
    ticketPrice: d.ticketPrice,
    description: d.description,
  }));

  const prompt = `
Kamu asisten wisata untuk platform "TrAvelIt".
Tugasmu merekomendasikan maksimal ${MAX_REKOMENDASI} destinasi dari katalog yang paling
sesuai dengan jawaban quiz pengguna.

Jawaban Quiz Pengguna:
${JSON.stringify(quizAnswers, null, 2)}

Katalog Destinasi Tersedia:
${JSON.stringify(ringkas, null, 2)}

Ketentuan:
1. Pilih maksimal ${MAX_REKOMENDASI} destinasi yang paling relevan.
2. Hanya boleh memilih dari id yang ada di katalog di atas.
3. Balas dengan objek JSON berisi field "ids" yang isinya array angka id terpilih.
`.trim();

  try {
    const hasil = await gemini.generateJson({
      prompt,
      responseSchema: {
        type: 'object',
        properties: { ids: { type: 'array', items: { type: 'number' } } },
        required: ['ids'],
      },
    });

    const idTerpilih = Array.isArray(hasil) ? hasil : hasil.ids || [];

    let rekomendasi = destinations.filter((d) => idTerpilih.includes(d.id));

    if (rekomendasi.length === 0) {
      rekomendasi = destinations.slice(0, MAX_REKOMENDASI);
    }

    return { success: true, data: rekomendasi.slice(0, MAX_REKOMENDASI) };
  } catch (err) {
    console.warn('[browse-destination] AI rekomendasi gagal, pakai fallback:', err.message);
    return { success: true, data: destinations.slice(0, MAX_REKOMENDASI) };
  }
}

module.exports = {
  getAllDestinations,
  getDestinationById,
  getRecommendations,
};
