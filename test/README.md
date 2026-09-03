# test/

```bash
npm test
```

Pakai **`node:test`**, test runner bawaan Node 18+ — nol dependency
tambahan, nggak perlu install jest/mocha.

- `itinerarySchema.test.js` — 14 test buat validator kontrak JSON
- `geo.test.js` — 10 test buat haversine, estimasi waktu tempuh, dan
  penyusunan query pencarian

## Kenapa cuma dua file ini yang diuji

Yang diuji otomatis di sini adalah **fungsi murni**: masuk data, keluar
data, tanpa jaringan dan tanpa database. Dua alasan:

1. **Di situlah kesalahan paling mahal.** `itinerarySchema.js` berdiri
   antara keluaran model bahasa dan database. Kalau dia salah, yang
   rusak bukan satu tampilan — tapi datanya, permanen. Salah satu test
   di `geo.test.js` sudah membuktikan gunanya: `Number(null)` itu `0`,
   jadi koordinat kosong sempat dihitung sebagai titik di lepas pantai
   Afrika dan menghasilkan jarak ~967 km yang ngarang.
2. **Sisanya lebih jujur diuji manual.** `geocode()` dan
   `reverseGeocode()` memanggil Nominatim sungguhan; yang berisiko di
   situ justru perilaku Nominatim asli (format respons, rate limit) yang
   nggak akan tertangkap oleh mock buatan sendiri. Sama halnya dengan
   `trip.service.js` yang memanggil Gemini.

## Cara ngetes yang nggak otomatis

**Nominatim:**

```bash
node -e "
const geo = require('./services/geo.service');
(async () => {
  console.log(await geo.geocode('Candi Borobudur, Magelang'));
  console.log(await geo.reverseGeocode(-7.7926, 110.3656));
  console.log(await geo.geocode('Tempat Yang Tidak Pernah Ada Xyzqw'));
})();
"
```

Harapannya: koordinat Borobudur sekitar `-7.60, 110.20`; reverse
menghasilkan kota Yogyakarta; tempat karangan menghasilkan `null` (bukan
melempar error). Totalnya harus lebih dari 2 detik — itu bukti antrian
1 request/detik bekerja.

**Generate itinerary end-to-end:** butuh `GEMINI_API_KEY` terisi dan
koneksi internet.

```bash
node -e "
const { sequelize, User } = require('./models');
const trip = require('./services/trip.service');
(async () => {
  await sequelize.sync();
  const u = await User.findOne({ where: { role: 'admin' } });
  const r = await trip.createAndGenerate({ userId: u.id, input: {
    destination: 'Bali', startDate: '2026-10-01', endDate: '2026-10-03',
    budget: 3000000, travelerCount: 2, interests: ['pantai'], pace: 'santai',
  }});
  console.log(r.success, r.message || '');
  process.exit(0);
})();
"
```

## Kalau nambah test baru

Nama file harus berakhiran `.test.js` supaya kebaca `node --test`.
Prioritaskan fungsi murni; kalau sebuah logic susah diuji karena
kecampur I/O, itu biasanya tanda logic-nya perlu dipisah dulu.
