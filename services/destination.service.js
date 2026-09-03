const { Op } = require('sequelize');
const { Destination, User } = require('../models');
const geminiService = require('./gemini.service');
const geo = require('./geo.service');

/**
 * Logic pengelolaan katalog destinasi wisata (M4).
 *
 * Asalnya `product.service.js` yang ditulis M4 buat tabel `products`.
 * Struktur & validasinya dipertahankan, cuma dipetakan ke skema
 * destinasi:
 *   price  -> ticketPrice
 *   stock  -> DIBUANG (destinasi gak punya stok)
 *   baru   -> city, province, lat, lng
 */

const KATEGORI_SAH = Destination.CATEGORIES;

async function getAllDestinations(query = {}) {
  const { search, category, city, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
  const where = {};

  if (search && search.trim() !== '') {
    where[Op.or] = [
      { name: { [Op.like]: `%${search.trim()}%` } },
      { description: { [Op.like]: `%${search.trim()}%` } },
      { city: { [Op.like]: `%${search.trim()}%` } },
    ];
  }

  if (category && category.trim() !== '' && category !== 'all') {
    where.category = category.trim().toLowerCase();
  }

  if (city && city.trim() !== '' && city !== 'all') {
    where.city = city.trim();
  }

  const validSortFields = ['id', 'name', 'ticketPrice', 'city', 'createdAt', 'category'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const orderDirection = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  return Destination.findAll({
    where,
    order: [[orderField, orderDirection]],
    include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }],
  });
}

async function getDestinationById(id) {
  return Destination.findByPk(id, {
    include: [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }],
  });
}

function validasiHarga(nilai, label) {
  const angka = parseInt(nilai, 10);
  if (Number.isNaN(angka) || angka < 0) {
    throw new Error(`${label} harus berupa angka positif atau nol`);
  }
  return angka;
}

/**
 * Koordinat boleh dikosongin - kalau kosong, dicoba dicari otomatis lewat
 * Nominatim dari nama + kota. Kegagalan geocoding SENGAJA gak bikin
 * simpan gagal: destinasi tanpa titik peta masih berguna di katalog,
 * dan admin bisa isi lat/lng manual belakangan.
 */
async function lengkapiKoordinat({ name, city, lat, lng }) {
  const adaLat = lat !== undefined && lat !== null && lat !== '';
  const adaLng = lng !== undefined && lng !== null && lng !== '';

  if (adaLat && adaLng) {
    return { lat: Number(lat), lng: Number(lng) };
  }

  try {
    const hasil = await geo.geocode(geo.buildSearchQuery(name, city));
    if (hasil) return { lat: hasil.lat, lng: hasil.lng };
  } catch {
    /* diabaikan sengaja - lihat komentar di atas */
  }

  return { lat: null, lng: null };
}

async function createDestination({
  name,
  category,
  city,
  province,
  description,
  ticketPrice,
  lat,
  lng,
  imageUrl,
  createdBy,
}) {
  if (!name || name.trim() === '') throw new Error('Nama destinasi wajib diisi');
  if (!category || category.trim() === '') throw new Error('Kategori destinasi wajib diisi');
  if (!city || city.trim() === '') throw new Error('Kota destinasi wajib diisi');

  const kategoriBersih = category.trim().toLowerCase();
  if (!KATEGORI_SAH.includes(kategoriBersih)) {
    throw new Error(`Kategori tidak dikenal (pilih: ${KATEGORI_SAH.join(', ')})`);
  }

  const harga = validasiHarga(ticketPrice ?? 0, 'Harga tiket');
  const koordinat = await lengkapiKoordinat({ name: name.trim(), city: city.trim(), lat, lng });

  return Destination.create({
    name: name.trim(),
    category: kategoriBersih,
    city: city.trim(),
    province: province && province.trim() !== '' ? province.trim() : null,
    description: description ? description.trim() : null,
    ticketPrice: harga,
    lat: koordinat.lat,
    lng: koordinat.lng,
    imageUrl: imageUrl && imageUrl.trim() !== '' ? imageUrl.trim() : null,
    createdBy: createdBy || null,
  });
}

async function updateDestination(id, data) {
  const destination = await Destination.findByPk(id);
  if (!destination) return null;

  const updates = {};

  if (data.name !== undefined) {
    if (!data.name.trim()) throw new Error('Nama destinasi tidak boleh kosong');
    updates.name = data.name.trim();
  }
  if (data.category !== undefined) {
    const kategoriBersih = String(data.category).trim().toLowerCase();
    if (!kategoriBersih) throw new Error('Kategori destinasi tidak boleh kosong');
    if (!KATEGORI_SAH.includes(kategoriBersih)) {
      throw new Error(`Kategori tidak dikenal (pilih: ${KATEGORI_SAH.join(', ')})`);
    }
    updates.category = kategoriBersih;
  }
  if (data.city !== undefined) {
    if (!data.city.trim()) throw new Error('Kota destinasi tidak boleh kosong');
    updates.city = data.city.trim();
  }
  if (data.province !== undefined) {
    updates.province = data.province ? data.province.trim() : null;
  }
  if (data.description !== undefined) {
    updates.description = data.description ? data.description.trim() : null;
  }
  if (data.ticketPrice !== undefined) {
    updates.ticketPrice = validasiHarga(data.ticketPrice, 'Harga tiket');
  }
  if (data.imageUrl !== undefined) {
    updates.imageUrl = data.imageUrl && data.imageUrl.trim() !== '' ? data.imageUrl.trim() : null;
  }
  if (data.lat !== undefined) updates.lat = data.lat === '' || data.lat === null ? null : Number(data.lat);
  if (data.lng !== undefined) updates.lng = data.lng === '' || data.lng === null ? null : Number(data.lng);

  await destination.update(updates);
  return destination;
}

async function deleteDestination(id) {
  const destination = await Destination.findByPk(id);
  if (!destination) return false;

  await destination.destroy();
  return true;
}

/**
 * Statistik ringkas buat dashboard M4. Versi aslinya ngitung total stok;
 * destinasi gak punya stok, jadi diganti hitungan yang relevan: berapa
 * yang udah punya titik peta, dan rata-rata harga tiket.
 */
async function getDestinationStats() {
  const totalDestinations = await Destination.count();
  const semua = await Destination.findAll({ attributes: ['category', 'ticketPrice', 'lat'] });

  const categoryCounts = {};
  let totalHarga = 0;
  let berkoordinat = 0;

  semua.forEach((d) => {
    const cat = d.category || 'lainnya';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    totalHarga += d.ticketPrice || 0;
    if (d.lat !== null) berkoordinat += 1;
  });

  return {
    totalDestinations,
    berkoordinat,
    tanpaKoordinat: totalDestinations - berkoordinat,
    rataHargaTiket: totalDestinations > 0 ? Math.round(totalHarga / totalDestinations) : 0,
    categoryCounts,
  };
}

async function generateAiDescription({ name, category, city, notes }) {
  return geminiService.generateDescription({ name, category, city, notes });
}

module.exports = {
  getAllDestinations,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination,
  getDestinationStats,
  generateAiDescription,
};
