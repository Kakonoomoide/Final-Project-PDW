const config = require('../config/env');

/**
 * Urusan lokasi (M5): geocoding (nama tempat -> koordinat), reverse
 * geocoding (koordinat -> nama kota), dan hitung jarak.
 *
 * Pakai Nominatim (OpenStreetMap) karena gratis dan gak butuh API key
 * maupun kartu kredit - penting buat project kuliah. Konsekuensinya:
 * Nominatim punya aturan pemakaian yang HARUS dipatuhi, kalau nggak
 * IP-nya diblokir:
 *
 *   1. Maksimal 1 request per detik  -> ditegakkan `antre()` di bawah
 *   2. Wajib kirim User-Agent jelas  -> dari config.nominatimUserAgent
 *
 * Makanya SEMUA panggilan ke Nominatim lewat file ini. Jangan manggil
 * dari tempat lain, apalagi langsung dari browser - kalau tiap browser
 * manggil sendiri, dua aturan di atas gak bisa ditegakkan sama sekali.
 * Buat kebutuhan browser ada endpoint proxy /api/geo/reverse.
 */

const RADIUS_BUMI_KM = 6371;

// Asumsi kecepatan rata-rata di kota. Ini ESTIMASI KASAR, bukan rute
// jalan sebenernya - kita gak punya routing engine. Angkanya ditampilin
// ke user dengan kata "sekitar" biar gak dikira presisi.
const KECEPATAN_KOTA_KMJAM = 30;
const MENIT_MINIMUM = 5;

const JEDA_ANTAR_REQUEST_MS = 1100; // 1 detik + sedikit kelonggaran
const TIMEOUT_MS = 8000;

// Cache sederhana: banyak aktivitas nyebut kota yang sama, gak perlu
// nanya Nominatim berulang kali buat query identik. Umurnya seumur
// proses aja - ini bukan cache serius, cuma penghemat request.
const cache = new Map();

// Antrian serial. Tiap panggilan nyambung ke ekor rantai promise, jadi
// request ke-2 baru jalan setelah request ke-1 kelar + jeda.
let rantaiAntrean = Promise.resolve();

function antre(tugas) {
  const hasil = rantaiAntrean.then(tugas);

  // `.catch(() => {})` di bawah ini BUKAN hiasan: tanpa itu, satu
  // request yang gagal bikin `rantaiAntrean` jadi promise rejected, dan
  // SEMUA request berikutnya ikut mati. Kegagalan aslinya tetep sampai
  // ke pemanggil lewat `hasil`, yang dikembalikan di bawah.
  rantaiAntrean = hasil
    .catch(() => {})
    .then(() => new Promise((resolve) => setTimeout(resolve, JEDA_ANTAR_REQUEST_MS)));

  return hasil;
}

function derajatKeRadian(derajat) {
  return (derajat * Math.PI) / 180;
}

/**
 * Jarak garis lurus antara dua koordinat (rumus haversine).
 *
 * Ini jarak "burung terbang", bukan jarak jalan - jarak aslinya pasti
 * lebih jauh. Cukup buat ngasih gambaran "deket" vs "jauh" di itinerary.
 */
function haversineKm(a, b) {
  if (!a || !b) return null;

  // Dicek null/undefined DULU sebelum Number(). Soalnya Number(null)
  // itu 0, dan 0 lolos Number.isFinite - jadi koordinat kosong bakal
  // diperlakukan sebagai titik di lepas pantai Afrika dan menghasilkan
  // jarak ratusan kilometer yang ngarang. Ini bukan kasus teoretis:
  // lat/lng memang null tiap kali geocoding sebuah tempat gagal.
  const angka = [a.lat, a.lng, b.lat, b.lng];
  if (angka.some((v) => v === null || v === undefined || v === '')) return null;

  const [lat1, lng1, lat2, lng2] = angka.map(Number);

  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

  const dLat = derajatKeRadian(lat2 - lat1);
  const dLng = derajatKeRadian(lng2 - lng1);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(derajatKeRadian(lat1)) * Math.cos(derajatKeRadian(lat2)) * Math.sin(dLng / 2) ** 2;

  const km = 2 * RADIUS_BUMI_KM * Math.asin(Math.sqrt(h));
  return Math.round(km * 100) / 100;
}

function estimateTravelMinutes(km) {
  if (km === null || km === undefined) return null;

  const angka = Number(km);
  if (!Number.isFinite(angka)) return null;

  const menit = Math.ceil((angka / KECEPATAN_KOTA_KMJAM) * 60);

  // Batas bawah 5 menit: tempat yang bersebelahan pun tetep butuh waktu
  // jalan kaki, parkir, dan orientasi. "0 menit" itu bohong.
  return Math.max(menit, MENIT_MINIMUM);
}

/**
 * Nempelin nama destinasi ke nama tempat biar pencariannya gak melebar
 * ("Pantai Kuta" doang bisa ketemu di banyak tempat). Tapi kalau nama
 * tempatnya udah nyebut destinasi, gak usah ditempel dua kali.
 */
function buildSearchQuery(nama, destinasi) {
  const namaBersih = String(nama || '').trim();
  const tujuanBersih = String(destinasi || '').trim();

  if (!tujuanBersih) return namaBersih;
  if (namaBersih.toLowerCase().includes(tujuanBersih.toLowerCase())) return namaBersih;

  return `${namaBersih}, ${tujuanBersih}`;
}

async function panggilNominatim(path, params) {
  const url = new URL(`${config.nominatimBaseUrl}${path}`);
  url.searchParams.set('format', 'jsonv2');
  Object.entries(params).forEach(([kunci, nilai]) => url.searchParams.set(kunci, nilai));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': config.nominatimUserAgent, // syarat wajib Nominatim
        'Accept-Language': 'id,en',
      },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Sengaja ditelan jadi null, BUKAN dilempar. Gagal verifikasi lokasi
    // gak boleh sampai bikin proses generate itinerary ikut gagal total -
    // aktivitasnya tetep kepake, cuma tanpa titik di peta. Ini keputusan
    // sadar: itinerary tanpa peta masih berguna, error page nggak.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Nama tempat -> koordinat. Balikin null kalau gak ketemu. */
async function geocode(query) {
  const kunci = `g:${query}`;
  if (cache.has(kunci)) return cache.get(kunci);

  const data = await antre(() =>
    panggilNominatim('/search', { q: query, limit: '1', addressdetails: '0' })
  );

  const pertama = Array.isArray(data) && data.length > 0 ? data[0] : null;
  const hasil = pertama
    ? {
        lat: Number(pertama.lat),
        lng: Number(pertama.lon), // Nominatim nyebutnya "lon", bukan "lng"
        displayName: pertama.display_name || query,
      }
    : null;

  cache.set(kunci, hasil);
  return hasil;
}

/** Koordinat -> nama kota. Dipake tombol "pakai lokasi saya". */
async function reverseGeocode(lat, lng) {
  // Kunci cache dibulatin 3 desimal (~100 meter). Geser sedikit gak
  // ngubah nama kota, jadi gak perlu nanya ulang.
  const kunci = `r:${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;
  if (cache.has(kunci)) return cache.get(kunci);

  const data = await antre(() =>
    panggilNominatim('/reverse', { lat: String(lat), lon: String(lng), zoom: '10' })
  );

  const alamat = data?.address || {};

  // Nominatim namain level administratif beda-beda tergantung negara &
  // kepadatan daerahnya, jadi dicoba beberapa kemungkinan dari yang
  // paling spesifik ke yang paling luas.
  const kota =
    alamat.city || alamat.town || alamat.municipality || alamat.county || alamat.state || null;

  const hasil = kota ? { city: kota, displayName: data.display_name || kota } : null;
  cache.set(kunci, hasil);
  return hasil;
}

module.exports = {
  haversineKm,
  estimateTravelMinutes,
  buildSearchQuery,
  geocode,
  reverseGeocode,
};
