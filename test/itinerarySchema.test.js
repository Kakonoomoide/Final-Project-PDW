const test = require('node:test');
const assert = require('node:assert');
const {
  validateItinerary,
  normalizeCategory,
  isValidCoordinate,
} = require('../services/itinerarySchema');

/** Bentuk itinerary yang BENAR. Tiap test merusak satu aspeknya aja. */
function itineraryValid(jumlahHari = 2) {
  return {
    destination: 'Bali',
    totalEstimatedCost: 2500000,
    currency: 'IDR',
    days: Array.from({ length: jumlahHari }, (_, i) => ({
      dayNumber: i + 1,
      summary: `Hari ke-${i + 1}`,
      activities: [
        {
          startTime: '09:00',
          name: 'Pantai Kuta',
          category: 'wisata',
          description: 'Menyusuri pantai',
          estimatedCost: 0,
          coordinates: { lat: -8.7184, lng: 115.1686 },
        },
      ],
    })),
  };
}

/* ============ yang harus DITOLAK (itinerary jadi gak kepake) ============ */

test('menolak kalau jumlah hari tidak sama dengan durasi trip', () => {
  const hasil = validateItinerary(itineraryValid(2), { durationDays: 4 });
  assert.strictEqual(hasil.ok, false);
  assert.ok(hasil.errors.some((e) => /jumlah hari/i.test(e)));
});

test('menolak days kosong, bukan array, atau raw null', () => {
  assert.strictEqual(validateItinerary({ days: [] }, { durationDays: 1 }).ok, false);
  assert.strictEqual(validateItinerary({ days: 'bukan array' }, { durationDays: 1 }).ok, false);
  assert.strictEqual(validateItinerary(null, { durationDays: 1 }).ok, false);
});

test('menolak hari yang tidak punya aktivitas', () => {
  const rusak = itineraryValid(1);
  rusak.days[0].activities = [];
  const hasil = validateItinerary(rusak, { durationDays: 1 });
  assert.strictEqual(hasil.ok, false);
  assert.ok(hasil.errors.some((e) => /aktivitas/i.test(e)));
});

test('menolak aktivitas tanpa nama', () => {
  const rusak = itineraryValid(1);
  delete rusak.days[0].activities[0].name;
  const hasil = validateItinerary(rusak, { durationDays: 1 });
  assert.strictEqual(hasil.ok, false);
  assert.ok(hasil.errors.some((e) => /nama/i.test(e)));
});

/* ============ yang harus DIBETULKAN (jelek tapi masih kepake) ============ */

test('menerima itinerary yang lengkap dan sesuai durasi', () => {
  const hasil = validateItinerary(itineraryValid(2), { durationDays: 2 });
  assert.strictEqual(hasil.ok, true);
  assert.strictEqual(hasil.value.days.length, 2);
  assert.strictEqual(hasil.value.days[0].activities[0].lat, -8.7184);
});

test('kategori tak dikenal dinormalisasi jadi lainnya, bukan ditolak', () => {
  const aneh = itineraryValid(1);
  aneh.days[0].activities[0].category = 'paralayang-ekstrem';
  const hasil = validateItinerary(aneh, { durationDays: 1 });
  assert.strictEqual(hasil.ok, true);
  assert.strictEqual(hasil.value.days[0].activities[0].category, 'lainnya');
});

test('koordinat di luar rentang sah dibuang jadi null, bukan bikin gagal', () => {
  const aneh = itineraryValid(1);
  aneh.days[0].activities[0].coordinates = { lat: 999, lng: 115 };
  const hasil = validateItinerary(aneh, { durationDays: 1 });
  assert.strictEqual(hasil.ok, true);
  assert.strictEqual(hasil.value.days[0].activities[0].lat, null);
});

test('biaya negatif atau bukan angka dijadikan 0', () => {
  const aneh = itineraryValid(1);
  aneh.days[0].activities[0].estimatedCost = -5000;
  const hasil = validateItinerary(aneh, { durationDays: 1 });
  assert.strictEqual(hasil.value.days[0].activities[0].estimatedCost, 0);
});

test('totalEstimatedCost dihitung ulang kalau AI lupa menjumlahkan', () => {
  const aneh = itineraryValid(1);
  aneh.days[0].activities[0].estimatedCost = 100000;
  aneh.totalEstimatedCost = 0;
  const hasil = validateItinerary(aneh, { durationDays: 1 });
  assert.strictEqual(hasil.value.totalEstimatedCost, 100000);
});

test('dayNumber diurutkan ulang 1..n walau AI mengirim acak', () => {
  const acak = itineraryValid(2);
  acak.days[0].dayNumber = 2;
  acak.days[0].summary = 'ini harusnya hari kedua';
  acak.days[1].dayNumber = 1;
  acak.days[1].summary = 'ini harusnya hari pertama';
  const hasil = validateItinerary(acak, { durationDays: 2 });
  assert.deepStrictEqual(
    hasil.value.days.map((d) => d.dayNumber),
    [1, 2]
  );
  assert.strictEqual(hasil.value.days[0].summary, 'ini harusnya hari pertama');
});

test('startTime dengan format ngawur dibuang jadi null', () => {
  const aneh = itineraryValid(1);
  aneh.days[0].activities[0].startTime = 'pagi-pagi banget';
  const hasil = validateItinerary(aneh, { durationDays: 1 });
  assert.strictEqual(hasil.value.days[0].activities[0].startTime, null);
});

test('orderNo diisi berurutan mulai dari 1', () => {
  const dua = itineraryValid(1);
  dua.days[0].activities.push({
    startTime: '13:00',
    name: 'Warung Babi Guling',
    category: 'kuliner',
    description: 'Makan siang',
    estimatedCost: 50000,
  });
  const hasil = validateItinerary(dua, { durationDays: 1 });
  assert.deepStrictEqual(
    hasil.value.days[0].activities.map((a) => a.orderNo),
    [1, 2]
  );
});

/* ============ helper ============ */

test('normalizeCategory memetakan sinonim umum', () => {
  assert.strictEqual(normalizeCategory('Kuliner'), 'kuliner');
  assert.strictEqual(normalizeCategory('hotel'), 'penginapan');
  assert.strictEqual(normalizeCategory('belanja'), 'wisata');
  assert.strictEqual(normalizeCategory(undefined), 'lainnya');
});

test('isValidCoordinate menolak nilai di luar bumi dan Null Island', () => {
  assert.strictEqual(isValidCoordinate(-8.7, 115.1), true);
  assert.strictEqual(isValidCoordinate(91, 0), false);
  assert.strictEqual(isValidCoordinate(0, 181), false);
  assert.strictEqual(isValidCoordinate(null, 115), false);
  // (0,0) itu tengah Samudra Atlantik - hampir selalu berarti AI gagal
  // nebak koordinat, bukan tempatnya beneran di sana
  assert.strictEqual(isValidCoordinate(0, 0), false);
});
