const tripService = require('../services/trip.service');
const { Preference } = require('../models');
const sendResponse = require('../utils/response');

/**
 * Controller fitur M5 (perencana rute wisata). Tipis: validasi input,
 * panggil service, bungkus pakai sendResponse.
 *
 * Semua endpoint di sini dipasangin `requireAuth` di routes-nya, jadi
 * `req.session.userId` dijamin ada pas nyampe fungsi-fungsi ini.
 *
 * Soal 404 vs 403: trip milik orang lain dibales "Trip tidak ditemukan",
 * SAMA PERSIS kayak trip yang emang gak ada. Sengaja gak dibedain jadi
 * 403 - membedakannya sama aja ngasih tau orang bahwa ID itu ada dan
 * punya orang lain.
 */

const MAX_DURASI_HARI = 14;
const MAX_WISATAWAN = 20;
const MAX_MINAT = 8;

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function tanggalSah(nilai) {
  if (typeof nilai !== 'string' || !POLA_TANGGAL.test(nilai)) return false;
  const tanggal = new Date(`${nilai}T00:00:00Z`);
  return !Number.isNaN(tanggal.getTime());
}

/**
 * Balikin pesan error pertama yang ketemu, atau null kalau semua lolos.
 * Dipisah dari handler biar aturannya kebaca sebagai satu daftar, dan
 * bisa dipakai ulang sama endpoint PATCH.
 */
function validasiInputTrip(body, { wajibLengkap = true } = {}) {
  const { destination, startDate, endDate, budget, travelerCount, interests, pace } = body;

  if (wajibLengkap || destination !== undefined) {
    if (!destination || !String(destination).trim()) return 'Tujuan wajib diisi';
    if (String(destination).length > 100) return 'Nama tujuan kepanjangan (maksimal 100 karakter)';
  }

  const adaTanggal = startDate !== undefined || endDate !== undefined;
  if (wajibLengkap || adaTanggal) {
    if (!tanggalSah(startDate) || !tanggalSah(endDate)) return 'Tanggal tidak valid';

    const durasi = tripService.hitungDurasi(startDate, endDate);
    if (durasi < 1) return 'Tanggal selesai tidak boleh sebelum tanggal mulai';

    // Batas 14 hari itu keputusan sadar, bukan angka asal: itinerary 30
    // hari bikin satu respons Gemini jadi sangat panjang (gampang
    // kepotong), dan verifikasi Nominatim-nya makan lebih dari 2 menit
    // karena antriannya 1 request per detik.
    if (durasi > MAX_DURASI_HARI) {
      return `Durasi perjalanan maksimal ${MAX_DURASI_HARI} hari`;
    }
  }

  if (wajibLengkap || budget !== undefined) {
    if (!Number.isFinite(Number(budget)) || Number(budget) <= 0) {
      return 'Budget harus lebih dari 0';
    }
  }

  if (travelerCount !== undefined) {
    const jumlah = Number(travelerCount);
    if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > MAX_WISATAWAN) {
      return `Jumlah wisatawan antara 1 sampai ${MAX_WISATAWAN}`;
    }
  }

  if (interests !== undefined) {
    if (!Array.isArray(interests)) return 'Minat harus berupa daftar';
    if (interests.length > MAX_MINAT) return `Minat maksimal ${MAX_MINAT}`;
  }

  if (pace !== undefined && !Preference.PACE.includes(pace)) {
    return `Gaya perjalanan tidak dikenal (pilih: ${Preference.PACE.join(', ')})`;
  }

  return null;
}

/** Bentuk data trip buat dikirim ke frontend. */
function bentukTrip(trip) {
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    originCity: trip.originCity,
    startDate: trip.startDate,
    endDate: trip.endDate,
    durationDays: trip.durationDays,
    budget: trip.budget,
    travelerCount: trip.travelerCount,
    status: trip.status,
    lastError: trip.lastError,
    createdAt: trip.createdAt,
  };
}

function bentukItinerary(itinerary) {
  if (!itinerary) return null;

  return {
    id: itinerary.id,
    version: itinerary.version,
    totalEstimatedCost: itinerary.totalEstimatedCost,
    currency: itinerary.currency,
    generatedAt: itinerary.generatedAt,
    days: (itinerary.days || []).map((hari) => ({
      dayNumber: hari.dayNumber,
      date: hari.date,
      summary: hari.summary,
      activities: (hari.activities || []).map((act) => ({
        orderNo: act.orderNo,
        startTime: act.startTime,
        name: act.name,
        category: act.category,
        description: act.description,
        estimatedCost: act.estimatedCost,
        lat: act.lat,
        lng: act.lng,
        placeVerified: act.placeVerified,
        distanceKmFromPrev: act.distanceKmFromPrev,
        travelMinutesFromPrev: act.travelMinutesFromPrev,
      })),
    })),
  };
}

/* ==================== handler ==================== */

async function generate(req, res) {
  try {
    const pesanError = validasiInputTrip(req.body);
    if (pesanError) {
      return sendResponse(res, { code: 400, success: false, message: pesanError });
    }

    const hasil = await tripService.createAndGenerate({
      userId: req.session.userId,
      input: req.body,
    });

    if (!hasil.success) {
      // 502, bukan 500: yang gagal itu layanan di luar aplikasi kita
      // (AI-nya), bukan bug di server ini. Trip-nya tetap tersimpan
      // dengan status failed, jadi ID-nya dikirim balik supaya frontend
      // bisa nawarin "coba lagi".
      return sendResponse(res, {
        code: 502,
        success: false,
        message: hasil.message,
        data: { trip: bentukTrip(hasil.trip) },
      });
    }

    return sendResponse(res, {
      code: 201,
      message: 'Itinerary berhasil dibuat',
      data: { trip: bentukTrip(hasil.trip) },
    });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function list(req, res) {
  try {
    const rows = await tripService.listTrips(req.session.userId);
    return sendResponse(res, { data: rows.map(bentukTrip) });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function detail(req, res) {
  try {
    const hasil = await tripService.getTrip(req.session.userId, req.params.id);
    if (!hasil) {
      return sendResponse(res, { code: 404, success: false, message: 'Trip tidak ditemukan' });
    }

    const { trip, itinerary } = hasil;

    return sendResponse(res, {
      data: {
        trip: bentukTrip(trip),
        preference: {
          interests: trip.preference ? trip.preference.interestList : [],
          pace: trip.preference ? trip.preference.pace : 'sedang',
          specialNeeds: trip.preference ? trip.preference.specialNeeds : null,
        },
        itinerary: bentukItinerary(itinerary),
      },
    });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function versions(req, res) {
  try {
    const rows = await tripService.listVersions(req.session.userId, req.params.id);
    if (!rows) {
      return sendResponse(res, { code: 404, success: false, message: 'Trip tidak ditemukan' });
    }
    return sendResponse(res, { data: rows });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function update(req, res) {
  try {
    const pesanError = validasiInputTrip(req.body, { wajibLengkap: false });
    if (pesanError) {
      return sendResponse(res, { code: 400, success: false, message: pesanError });
    }

    const trip = await tripService.updateTrip(req.session.userId, req.params.id, req.body);
    if (!trip) {
      return sendResponse(res, { code: 404, success: false, message: 'Trip tidak ditemukan' });
    }

    return sendResponse(res, {
      message: 'Trip diperbarui. Tekan "Buat Ulang" kalau mau itinerary baru.',
      data: { trip: bentukTrip(trip) },
    });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function regenerate(req, res) {
  try {
    const hasil = await tripService.regenerate(req.session.userId, req.params.id);
    if (!hasil) {
      return sendResponse(res, { code: 404, success: false, message: 'Trip tidak ditemukan' });
    }

    if (!hasil.success) {
      return sendResponse(res, { code: 502, success: false, message: hasil.message });
    }

    return sendResponse(res, {
      message: `Itinerary versi ${hasil.itinerary.version} berhasil dibuat`,
      data: { version: hasil.itinerary.version },
    });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function hapus(req, res) {
  try {
    const terhapus = await tripService.deleteTrip(req.session.userId, req.params.id);
    if (!terhapus) {
      return sendResponse(res, { code: 404, success: false, message: 'Trip tidak ditemukan' });
    }
    return sendResponse(res, { message: 'Trip dihapus' });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

module.exports = { generate, list, detail, versions, update, regenerate, hapus };
