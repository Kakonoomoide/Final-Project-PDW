const test = require('node:test');
const assert = require('node:assert');
const { haversineKm, estimateTravelMinutes, buildSearchQuery } = require('../services/geo.service');

/**
 * Cuma fungsi MURNI yang diuji di sini. `geocode()` & `reverseGeocode()`
 * manggil jaringan dan sengaja TIDAK di-mock: yang berisiko di situ
 * justru perilaku Nominatim asli (format respons, rate limit), dan itu
 * gak bakal ketangkep sama mock buatan sendiri. Keduanya diuji manual -
 * caranya ada di test/README.md.
 */

test('haversine menghitung jarak dua titik yang dikenal', () => {
  // Monas -> Bundaran HI, jaraknya sekitar 2 km
  const jarak = haversineKm({ lat: -6.1754, lng: 106.8272 }, { lat: -6.195, lng: 106.823 });
  assert.ok(jarak > 1.5 && jarak < 2.5, `harusnya sekitar 2 km, dapat ${jarak}`);
});

test('haversine untuk titik yang sama menghasilkan 0', () => {
  assert.strictEqual(haversineKm({ lat: -8.7, lng: 115.1 }, { lat: -8.7, lng: 115.1 }), 0);
});

test('haversine mengembalikan null kalau salah satu titik tidak lengkap', () => {
  assert.strictEqual(haversineKm({ lat: null, lng: 115 }, { lat: -8.7, lng: 115.1 }), null);
  assert.strictEqual(haversineKm(null, { lat: -8.7, lng: 115.1 }), null);
  assert.strictEqual(haversineKm({ lat: -8.7, lng: 115.1 }, undefined), null);
});

test('jarak Jakarta-Surabaya masuk akal (sekitar 660 km)', () => {
  const jarak = haversineKm({ lat: -6.2088, lng: 106.8456 }, { lat: -7.2575, lng: 112.7521 });
  assert.ok(jarak > 600 && jarak < 700, `harusnya sekitar 660 km, dapat ${jarak}`);
});

test('estimasi waktu tempuh punya batas bawah 5 menit', () => {
  // tempat yang bersebelahan tetep butuh waktu jalan kaki + orientasi
  assert.strictEqual(estimateTravelMinutes(0.1), 5);
  assert.strictEqual(estimateTravelMinutes(0), 5);
});

test('estimasi waktu tempuh naik seiring jarak', () => {
  assert.ok(estimateTravelMinutes(30) > estimateTravelMinutes(10));
});

test('estimasi waktu tempuh null kalau jaraknya null', () => {
  assert.strictEqual(estimateTravelMinutes(null), null);
  assert.strictEqual(estimateTravelMinutes(undefined), null);
});

test('buildSearchQuery menempelkan destinasi kalau belum disebut', () => {
  assert.strictEqual(buildSearchQuery('Pantai Kuta', 'Bali'), 'Pantai Kuta, Bali');
});

test('buildSearchQuery tidak menempel dua kali kalau nama sudah memuat destinasi', () => {
  assert.strictEqual(buildSearchQuery('Pantai Kuta Bali', 'Bali'), 'Pantai Kuta Bali');
  assert.strictEqual(buildSearchQuery('Museum bali kuno', 'Bali'), 'Museum bali kuno');
});

test('buildSearchQuery aman kalau destinasi kosong', () => {
  assert.strictEqual(buildSearchQuery('Pantai Kuta', ''), 'Pantai Kuta');
  assert.strictEqual(buildSearchQuery('Pantai Kuta', undefined), 'Pantai Kuta');
});
