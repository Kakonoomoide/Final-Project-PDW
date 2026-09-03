const { Activity } = require('../models');

/**
 * Kontrak keluaran AI buat itinerary + validatornya (M5).
 *
 * Kenapa ini file terpisah dan kenapa segini ketatnya: model bahasa gak
 * nulis JSON dengan jaminan apa pun. Dia bisa lupa satu field, ngasih 3
 * hari padahal diminta 5, atau ngarang koordinat. Kalau JSON mentahnya
 * langsung ditelen ke database, yang rusak bukan cuma satu tampilan -
 * tapi datanya, dan itu permanen.
 *
 * Prinsip yang dipakai di sini ada dua, dan bedanya penting:
 *
 *   1. Yang bikin itinerary GAK ADA GUNANYA  -> TOLAK
 *      (days kosong, hari tanpa aktivitas, aktivitas tanpa nama,
 *       jumlah hari gak sesuai pesanan)
 *
 *   2. Yang cuma bikin JELEK tapi masih kepake -> BETULKAN diam-diam
 *      (kategori aneh, jam ngawur, koordinat mustahil, biaya minus,
 *       nomor hari acak)
 *
 * Kalau semua hal kecil bikin gagal, user bakal ketemu pesan error terus
 * padahal itinerary-nya sebenernya udah bagus. Kalau semua dibiarin,
 * datanya jadi sampah. Makanya dipisah.
 */

const KATEGORI_SAH = Activity.CATEGORIES;

// Sinonim yang sering dipakai model bahasa. Dipetakan, bukan ditolak -
// "hotel" dan "penginapan" itu maksudnya sama, gak ada gunanya
// nyalahin AI cuma karena beda pilihan kata.
const PETA_SINONIM = {
  hotel: 'penginapan',
  menginap: 'penginapan',
  akomodasi: 'penginapan',
  makan: 'kuliner',
  makanan: 'kuliner',
  restoran: 'kuliner',
  perjalanan: 'transport',
  transportasi: 'transport',
  atraksi: 'wisata',
  rekreasi: 'wisata',
  belanja: 'wisata',
};

/**
 * Schema yang dikirim ke Gemini biar dia balas JSON, bukan prosa.
 * Ini ngatur BENTUK-nya doang - isinya tetep divalidasi ulang di
 * validateItinerary(), soalnya schema gak bisa maksa "harus 5 hari".
 */
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    destination: { type: 'string' },
    totalEstimatedCost: { type: 'number' },
    currency: { type: 'string' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dayNumber: { type: 'number' },
          summary: { type: 'string' },
          activities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                startTime: { type: 'string' },
                name: { type: 'string' },
                category: { type: 'string' },
                description: { type: 'string' },
                estimatedCost: { type: 'number' },
                coordinates: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                  },
                  required: ['lat', 'lng'],
                },
              },
              required: ['name', 'category', 'description', 'estimatedCost'],
            },
          },
        },
        required: ['dayNumber', 'summary', 'activities'],
      },
    },
  },
  required: ['destination', 'days'],
};

function normalizeCategory(value) {
  if (typeof value !== 'string') return 'lainnya';
  const bersih = value.trim().toLowerCase();
  if (KATEGORI_SAH.includes(bersih)) return bersih;
  return PETA_SINONIM[bersih] || 'lainnya';
}

/**
 * (0,0) sengaja dianggap TIDAK sah. Titik itu ada di tengah Samudra
 * Atlantik - orang menyebutnya "Null Island" - dan hampir selalu berarti
 * model gagal nebak koordinat, bukan bahwa tempatnya beneran di sana.
 */
function isValidCoordinate(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

function bersihkanJam(value) {
  if (typeof value !== 'string') return null;
  const cocok = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!cocok) return null;
  return `${cocok[1].padStart(2, '0')}:${cocok[2]}`;
}

function bersihkanBiaya(value) {
  const angka = Number(value);
  if (!Number.isFinite(angka) || angka < 0) return 0;
  return Math.round(angka);
}

function bersihkanTeks(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function validateItinerary(raw, { durationDays }) {
  const errors = [];

  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Balasan AI bukan objek JSON yang bisa dibaca'] };
  }
  if (!Array.isArray(raw.days) || raw.days.length === 0) {
    return { ok: false, errors: ['Balasan AI tidak berisi daftar hari (days)'] };
  }
  if (raw.days.length !== durationDays) {
    errors.push(
      `Jumlah hari dari AI (${raw.days.length}) tidak sama dengan durasi trip (${durationDays})`
    );
  }

  // Diurutkan dulu berdasar dayNumber yang dikasih AI, BARU nomornya
  // ditulis ulang 1..n. Jadi kalau AI ngirim acak, urutan isinya tetep
  // bener dan nomornya tetep rapi.
  const hariTerurut = [...raw.days].sort(
    (a, b) => (Number(a?.dayNumber) || 0) - (Number(b?.dayNumber) || 0)
  );

  const days = [];

  hariTerurut.forEach((hari, indexHari) => {
    const nomorHari = indexHari + 1;

    if (!hari || !Array.isArray(hari.activities) || hari.activities.length === 0) {
      errors.push(`Hari ke-${nomorHari} tidak punya aktivitas satu pun`);
      return;
    }

    const activities = [];

    hari.activities.forEach((act, indexAct) => {
      const nama = bersihkanTeks(act?.name);
      if (!nama) {
        errors.push(`Aktivitas ke-${indexAct + 1} di hari ke-${nomorHari} tidak punya nama`);
        return;
      }

      const koordinat = act?.coordinates || {};
      const lat = Number(koordinat.lat);
      const lng = Number(koordinat.lng);
      const koordinatSah = isValidCoordinate(lat, lng);

      activities.push({
        orderNo: activities.length + 1,
        startTime: bersihkanJam(act?.startTime),
        name: nama,
        category: normalizeCategory(act?.category),
        description: bersihkanTeks(act?.description),
        estimatedCost: bersihkanBiaya(act?.estimatedCost),
        lat: koordinatSah ? lat : null,
        lng: koordinatSah ? lng : null,
      });
    });

    if (activities.length === 0) {
      errors.push(`Hari ke-${nomorHari} tidak punya aktivitas yang valid`);
      return;
    }

    days.push({
      dayNumber: nomorHari,
      summary: bersihkanTeks(hari.summary, `Hari ke-${nomorHari}`),
      activities,
    });
  });

  if (errors.length > 0) return { ok: false, errors };

  // Total dari AI cuma dipercaya kalau nyambung sama penjumlahan
  // aktivitasnya. Kalau meleset ke bawah (atau 0 padahal aktivitasnya
  // berbayar), yang dipake hasil hitungan sendiri - angka yang bisa
  // ditelusuri asalnya lebih berguna daripada angka yang enak dibaca.
  //
  // Kenapa `>=` dan bukan `===`: wajar kalau AI nambahin biaya yang gak
  // nempel di satu aktivitas tertentu, misal tiket pesawat pulang-pergi.
  const totalDihitung = days.reduce(
    (sum, d) => sum + d.activities.reduce((s, a) => s + a.estimatedCost, 0),
    0
  );
  const totalDariAi = bersihkanBiaya(raw.totalEstimatedCost);
  const totalDipakai = totalDariAi > 0 && totalDariAi >= totalDihitung ? totalDariAi : totalDihitung;

  return {
    ok: true,
    value: {
      destination: bersihkanTeks(raw.destination),
      totalEstimatedCost: totalDipakai,
      currency: bersihkanTeks(raw.currency, 'IDR').toUpperCase(),
      days,
    },
  };
}

module.exports = { RESPONSE_SCHEMA, validateItinerary, normalizeCategory, isValidCoordinate };
