const { sequelize, Trip, Preference, Itinerary, ItineraryDay, Activity } = require('../models');
const config = require('../config/env');
const gemini = require('./gemini.service');
const geo = require('./geo.service');
const { RESPONSE_SCHEMA, validateItinerary } = require('./itinerarySchema');

/**
 * Logic fitur M5: perencana rute wisata. Urusan HTTP-nya ada di
 * controllers/trip.controller.js, di sini murni logic + query database.
 *
 * ATURAN YANG GAK BOLEH DILANGGAR DI SELURUH FILE INI:
 * setiap query yang nyentuh `Trip` WAJIB nyertain `userId` di klausa
 * `where`. Bukan dicek setelah datanya diambil - disaring di query-nya
 * langsung. Fungsi yang gak nemu trip balikin null, dan controller
 * nerjemahin itu jadi 404 (bukan 403), biar keberadaan sebuah ID gak
 * bocor ke orang yang bukan pemiliknya.
 */

const SYSTEM_INSTRUCTION = `
Kamu perencana perjalanan di aplikasi TrAvelIt.
Tugasmu menyusun itinerary harian yang realistis untuk wisatawan Indonesia.
Kamu selalu menjawab dalam Bahasa Indonesia.
Kamu mengutamakan jadwal yang masuk akal secara waktu dan jarak,
bukan jadwal yang terlihat padat di atas kertas.
`.trim();

// Berapa aktivitas per hari untuk tiap gaya perjalanan. Ditaruh di sini
// (bukan cuma di prompt) biar gampang diubah dan konsisten.
const AKTIVITAS_PER_PACE = {
  santai: '2 sampai 3',
  sedang: '4',
  padat: '5 sampai 6',
};

// Maksimal 2 percobaan. Lebih dari itu cuma membakar kuota API buat
// model yang jelas lagi gak bisa nurutin kontraknya.
const MAX_PERCOBAAN = 2;

/* ==================== helper tanggal ==================== */

function hitungDurasi(startDate, endDate) {
  const mulai = new Date(`${startDate}T00:00:00Z`);
  const selesai = new Date(`${endDate}T00:00:00Z`);
  const selisihHari = Math.round((selesai - mulai) / (1000 * 60 * 60 * 24));
  return selisihHari + 1; // inklusif: 1-3 Okt itu 3 hari, bukan 2
}

function tambahHari(tanggalStr, jumlah) {
  const tanggal = new Date(`${tanggalStr}T00:00:00Z`);
  tanggal.setUTCDate(tanggal.getUTCDate() + jumlah);
  return tanggal.toISOString().slice(0, 10);
}

/* ==================== prompt ==================== */

function bangunPrompt(trip, preference) {
  const minat = preference.interestList;
  const gaya = preference.pace || 'sedang';

  const baris = [
    `Susun itinerary perjalanan ke ${trip.destination}.`,
    '',
    'Detail perjalanan:',
    `- Tujuan: ${trip.destination}`,
    trip.originCity ? `- Berangkat dari: ${trip.originCity}` : null,
    `- Tanggal: ${trip.startDate} sampai ${trip.endDate} (${trip.durationDays} hari)`,
    `- Jumlah wisatawan: ${trip.travelerCount} orang`,
    `- Budget total: Rp ${Number(trip.budget).toLocaleString('id-ID')}`,
    minat.length ? `- Minat: ${minat.join(', ')}` : null,
    `- Gaya perjalanan: ${gaya}`,
    preference.specialNeeds ? `- Kebutuhan khusus: ${preference.specialNeeds}` : null,
    '',
    'Aturan wajib:',
    `- Buat TEPAT ${trip.durationDays} hari, tidak lebih dan tidak kurang.`,
    `- Isi ${AKTIVITAS_PER_PACE[gaya] || '4'} aktivitas per hari.`,
    '- Sebutkan nama tempat yang BENAR-BENAR ADA dan bisa dicari di peta.',
    '  Jangan mengarang nama tempat. Kalau ragu, pilih tempat populer yang pasti ada.',
    '- Isi coordinates dengan lintang & bujur tempat itu sebaik yang kamu tahu.',
    `- estimatedCost dalam Rupiah, angka bulat, untuk ${trip.travelerCount} orang.`,
    `  Total seluruh aktivitas sebaiknya tidak melebihi Rp ${Number(trip.budget).toLocaleString('id-ID')}.`,
    '- Urutkan aktivitas dalam sehari secara masuk akal secara geografis -',
    '  jangan bolak-balik menyeberang kota.',
    '- startTime format 24 jam "HH:MM".',
    '- category dipilih dari: wisata, kuliner, transport, penginapan, lainnya.',
  ];

  return baris.filter((b) => b !== null).join('\n');
}

/* ==================== verifikasi tempat ==================== */

/**
 * Cek tiap tempat ke Nominatim, lalu hitung jarak antar aktivitas.
 *
 * Ini mitigasi risiko "tempat halusinatif": model bahasa bisa nyebut
 * tempat yang gak ada dengan nada sangat yakin. Kalimat "jangan
 * mengarang" di prompt cuma NGURANGIN peluangnya - yang beneran nangkep
 * tempat palsu ya pengecekan ini.
 *
 * Objek aktivitasnya diubah di tempat (mutasi), bukan bikin salinan
 * baru, soalnya jumlahnya bisa puluhan dan hasilnya langsung dipakai.
 */
async function verifikasiTempat(days, destinasi) {
  for (const hari of days) {
    for (const act of hari.activities) {
      // Kategori transport dilewati: "perjalanan ke bandara" itu bukan
      // tempat yang bisa dicari, dan maksa nge-geocode-nya cuma buang
      // jatah request (yang cuma 1 per detik).
      if (act.category === 'transport') {
        act.placeVerified = false;
        continue;
      }

      const hasil = await geo.geocode(geo.buildSearchQuery(act.name, destinasi));

      if (hasil) {
        act.lat = hasil.lat;
        act.lng = hasil.lng;
        act.placeVerified = true;
      } else {
        // Gak ketemu di OSM. Koordinat tebakan AI (kalau ada) tetep
        // dipake supaya titiknya muncul di peta, TAPI ditandai belum
        // terverifikasi biar UI bisa kasih peringatan.
        act.placeVerified = false;
      }
    }

    // Jarak dihitung PER HARI, bukan lintas hari - hari baru biasanya
    // mulai lagi dari penginapan, jadi jarak dari aktivitas terakhir
    // kemarin gak ada artinya.
    for (let i = 1; i < hari.activities.length; i++) {
      const sebelum = hari.activities[i - 1];
      const sekarang = hari.activities[i];

      const km = geo.haversineKm(sebelum, sekarang);
      if (km !== null) {
        sekarang.distanceKmFromPrev = km;
        sekarang.travelMinutesFromPrev = geo.estimateTravelMinutes(km);
      }
    }
  }

  return days;
}

/* ==================== simpan ==================== */

/**
 * Simpan satu versi itinerary utuh dalam SATU transaksi.
 *
 * Kalau penyimpanan gagal di tengah, yang tersisa bukan itinerary
 * setengah jadi - mending gak ada sama sekali daripada user ngeliat
 * "Hari 3" yang aktivitasnya ilang.
 *
 * Panggilan ke Gemini & Nominatim sengaja dilakuin DI LUAR transaksi
 * (liat generateUntuk di bawah). Dua-duanya bisa makan puluhan detik,
 * dan nahan transaksi SQLite selama itu bakal ngunci database buat
 * semua request lain.
 */
async function simpanVersi(trip, hasilValid) {
  return sequelize.transaction(async (transaction) => {
    const versiTerakhir = await Itinerary.max('version', {
      where: { tripId: trip.id },
      transaction,
    });

    const itinerary = await Itinerary.create(
      {
        tripId: trip.id,
        version: (versiTerakhir || 0) + 1,
        totalEstimatedCost: hasilValid.totalEstimatedCost,
        currency: hasilValid.currency,
        modelUsed: config.geminiModel,
        generatedAt: new Date(),
      },
      { transaction }
    );

    for (const hari of hasilValid.days) {
      const dayRow = await ItineraryDay.create(
        {
          itineraryId: itinerary.id,
          dayNumber: hari.dayNumber,
          // Tanggal dihitung di server dari startDate trip, BUKAN dari
          // AI - model bahasa gampang keliru ngitung tanggal apalagi
          // kalau nyeberang bulan.
          date: tambahHari(trip.startDate, hari.dayNumber - 1),
          summary: hari.summary,
        },
        { transaction }
      );

      await Activity.bulkCreate(
        hari.activities.map((act) => ({
          itineraryDayId: dayRow.id,
          orderNo: act.orderNo,
          startTime: act.startTime,
          name: act.name,
          category: act.category,
          description: act.description,
          estimatedCost: act.estimatedCost,
          lat: act.lat,
          lng: act.lng,
          placeVerified: Boolean(act.placeVerified),
          distanceKmFromPrev: act.distanceKmFromPrev ?? null,
          travelMinutesFromPrev: act.travelMinutesFromPrev ?? null,
        })),
        { transaction }
      );
    }

    await trip.update({ status: Trip.STATUS.GENERATED, lastError: null }, { transaction });

    return itinerary;
  });
}

/* ==================== generate ==================== */

/**
 * Inti generate, dipakai bareng sama createAndGenerate() & regenerate().
 *
 * Kalau hasil AI gak lolos validasi, dicoba SEKALI lagi dengan prompt
 * yang ditambahi daftar kesalahannya - seringkali model bisa
 * memperbaiki sendiri begitu dikasih tau salahnya di mana.
 */
async function generateUntuk(trip, preference) {
  const promptAwal = bangunPrompt(trip, preference);
  let prompt = promptAwal;
  let errorTerakhir = null;

  for (let percobaan = 1; percobaan <= MAX_PERCOBAAN; percobaan++) {
    let mentah;

    try {
      mentah = await gemini.generateJson({
        prompt,
        systemInstruction: SYSTEM_INSTRUCTION,
        responseSchema: RESPONSE_SCHEMA,
      });
    } catch (err) {
      errorTerakhir = err.message;
      break; // error API (key salah, kuota habis) percuma diulang di sini -
             // gemini.service udah punya retry sendiri buat 503/429
    }

    const hasil = validateItinerary(mentah, { durationDays: trip.durationDays });

    if (hasil.ok) {
      await verifikasiTempat(hasil.value.days, trip.destination);
      const itinerary = await simpanVersi(trip, hasil.value);
      return { success: true, itinerary };
    }

    errorTerakhir = hasil.errors.join('; ');
    prompt = `${promptAwal}\n\nPercobaan sebelumnya ditolak karena:\n- ${hasil.errors.join('\n- ')}\nPerbaiki dan balas ulang.`;
  }

  // Trip TETEP disimpen dengan status failed, gak dihapus - biar user
  // bisa mencet "coba lagi" tanpa ngisi ulang formulirnya dari nol.
  await trip.update({
    status: Trip.STATUS.FAILED,
    lastError: (errorTerakhir || 'Gagal membuat itinerary').slice(0, 250),
  });

  return { success: false, message: errorTerakhir || 'Gagal membuat itinerary' };
}

async function createAndGenerate({ userId, input }) {
  const durationDays = hitungDurasi(input.startDate, input.endDate);

  const trip = await Trip.create({
    userId,
    title: input.title || `Perjalanan ke ${input.destination}`,
    destination: input.destination,
    originCity: input.originCity || null,
    startDate: input.startDate,
    endDate: input.endDate,
    durationDays,
    budget: input.budget,
    travelerCount: input.travelerCount || 1,
    status: Trip.STATUS.DRAFT,
  });

  const preference = await Preference.create({
    tripId: trip.id,
    interests: JSON.stringify(input.interests || []),
    pace: input.pace || 'sedang',
    specialNeeds: input.specialNeeds || null,
  });

  const hasil = await generateUntuk(trip, preference);

  return { ...hasil, trip };
}

async function regenerate(userId, tripId) {
  const trip = await Trip.findOne({ where: { id: tripId, userId } });
  if (!trip) return null;

  const preference =
    (await Preference.findOne({ where: { tripId: trip.id } })) ||
    (await Preference.create({ tripId: trip.id }));

  const hasil = await generateUntuk(trip, preference);

  return { ...hasil, trip };
}

/* ==================== baca ==================== */

function listTrips(userId) {
  return Trip.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
}

async function getTrip(userId, tripId) {
  const trip = await Trip.findOne({
    where: { id: tripId, userId }, // userId WAJIB ada di sini
    include: [{ model: Preference, as: 'preference' }],
  });

  if (!trip) return null;

  const itinerary = await Itinerary.findOne({
    where: { tripId: trip.id },
    include: [
      {
        model: ItineraryDay,
        as: 'days',
        include: [{ model: Activity, as: 'activities' }],
      },
    ],
    // Satu klausa `order` aja - Sequelize gak nerima dua kunci `order`
    // dalam satu objek (yang kedua nimpa yang pertama diam-diam).
    // Baris 1 milih versi TERBARU; baris 2 & 3 ngurutin hari dan
    // aktivitasnya, soalnya tanpa itu urutannya ngikut urutan baris di
    // database - kebetulan bener sekarang, belum tentu nanti.
    order: [
      ['version', 'DESC'],
      [{ model: ItineraryDay, as: 'days' }, 'dayNumber', 'ASC'],
      [{ model: ItineraryDay, as: 'days' }, { model: Activity, as: 'activities' }, 'orderNo', 'ASC'],
    ],
  });

  // itinerary bisa null kalau trip statusnya masih draft/failed -
  // itu kondisi normal, bukan error. Halaman detail harus siap.
  return { trip, itinerary };
}

async function listVersions(userId, tripId) {
  const trip = await Trip.findOne({ where: { id: tripId, userId } });
  if (!trip) return null;

  return Itinerary.findAll({
    where: { tripId: trip.id },
    attributes: ['id', 'version', 'totalEstimatedCost', 'currency', 'generatedAt'],
    order: [['version', 'DESC']],
  });
}

/* ==================== ubah & hapus ==================== */

// Sengaja daftar putih, bukan daftar hitam: field yang gak disebut di
// sini diabaikan diam-diam. Jadi kalau nanti ada kolom baru yang
// sensitif (misal userId), dia otomatis aman tanpa perlu inget-inget
// nambahin ke daftar larangan.
const FIELD_BOLEH_DIUBAH = ['title', 'startDate', 'endDate', 'budget', 'travelerCount', 'originCity'];

async function updateTrip(userId, tripId, patch) {
  const trip = await Trip.findOne({ where: { id: tripId, userId } });
  if (!trip) return null;

  const perubahan = {};
  FIELD_BOLEH_DIUBAH.forEach((field) => {
    if (patch[field] !== undefined) perubahan[field] = patch[field];
  });

  if (perubahan.startDate || perubahan.endDate) {
    perubahan.durationDays = hitungDurasi(
      perubahan.startDate || trip.startDate,
      perubahan.endDate || trip.endDate
    );
  }

  await trip.update(perubahan);

  // Preferensi disimpan di tabel terpisah, jadi diurus terpisah juga.
  if (patch.interests !== undefined || patch.pace !== undefined || patch.specialNeeds !== undefined) {
    const preference =
      (await Preference.findOne({ where: { tripId: trip.id } })) ||
      (await Preference.create({ tripId: trip.id }));

    await preference.update({
      ...(patch.interests !== undefined ? { interests: JSON.stringify(patch.interests) } : {}),
      ...(patch.pace !== undefined ? { pace: patch.pace } : {}),
      ...(patch.specialNeeds !== undefined ? { specialNeeds: patch.specialNeeds } : {}),
    });
  }

  // Perubahan data SENGAJA gak otomatis memicu regenerate. Itu panggilan
  // API yang makan waktu & kuota - user yang mutusin, lewat tombol
  // "Buat Ulang" yang terpisah.
  return trip;
}

async function deleteTrip(userId, tripId) {
  const jumlah = await Trip.destroy({ where: { id: tripId, userId } });
  return jumlah > 0;
}

module.exports = {
  createAndGenerate,
  regenerate,
  listTrips,
  getTrip,
  listVersions,
  updateTrip,
  deleteTrip,
  hitungDurasi,
};
