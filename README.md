# TrAvelIt — Final Project PDW

Perencana rute wisata kustom berbasis AI: Express + SQLite +
HTML/Bootstrap + Gemini + Leaflet.

Isi tujuan, tanggal, dan budget — AI menyusun itinerary harian lengkap
dengan estimasi biaya, lalu tiap tempatnya diverifikasi ke OpenStreetMap
dan dipetakan. Kerjaan tim; pembagian fitur & detail lengkap ada di
[`PRD.md`](./PRD.md).

## Status pengerjaan

| Modul | Fitur | Status |
|---|---|---|
| Instruktur | Login admin & register user (session, 1 tabel `users` dibedain `role`) | ✅ |
| Instruktur | Struktur database (9 tabel) | ✅ |
| Instruktur | Navbar & sidebar reusable lewat partial HTML | ✅ |
| **M1** | Landing page + cuaca kota tujuan + AI waktu berkunjung | ✅ |
| **M2** | CRUD Artikel wisata + AI caption | ✅ |
| **M3** | Browse destinasi + AI destination finder (quiz) | ✅ |
| **M4** | CRUD Destinasi + AI deskripsi | ✅ |
| **M5** | Perencana rute wisata + peta + geolocation + asisten AI | ✅ |

Tinggal `views/user/landing.html` (M1) yang masih placeholder. File-nya
sudah berisi komentar TODO berisi endpoint & model apa yang tersedia —
lihat `PRD.md` bagian 9.

## Cara install & jalanin

```bash
cp .env.example .env
# isi GEMINI_API_KEY di .env (minta ke ketua tim/instruktur kalau belum
# ada, SATU key yang sama dipake bareng-bareng).
# WEATHER_API_KEY cuma dibutuhin M1.
# NOMINATIM_* GAK BUTUH API KEY, biarin apa adanya.

npm install
npm run seed    # bikin akun admin + 6 destinasi & 3 artikel dummy
npm run dev
```

Buka `http://localhost:3000`.

**Login admin default** (dari seeder): `admin@travelit.com` / `admin123`

### Script yang tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | jalanin server dengan auto-reload (nodemon) |
| `npm start` | jalanin server biasa |
| `npm run seed` | bikin admin + data dummy (aman diulang, pakai `findOrCreate`) |
| `npm test` | jalanin unit test (`node:test`, tanpa dependency tambahan) |
| `npm run db:reset` | **hapus** file SQLite lalu seed ulang |

> ⚠️ `npm run db:reset` **menghapus seluruh data lokal** — trip, riwayat
> chat, semuanya. Cuma dipakai kalau skema tabelnya berubah dan bikin
> error. Matiin `npm run dev` dulu, kalau nggak file databasenya lagi
> dipegang server dan gagal dihapus.

### Kalau habis `git pull` muncul error tabel

Project ini pakai `sequelize.sync()`, bukan migrasi berversi — jadi kolom
baru otomatis kebuat, tapi kolom yang BERUBAH tipe/namanya nggak. Kalau
muncul error semacam `no such column`, jalanin `npm run db:reset`.

Catatan: versi lama project ini punya tabel `products` & `news`. Sekarang
namanya `destinations` & `articles`. Database lama masih nyimpen dua tabel
usang itu — nggak berbahaya (kosong, nggak direferensi), tapi kalau mau
bersih ya `npm run db:reset`.

## Struktur folder

```
final-project-pdw/
├── app.js
├── config/          # env & koneksi database
├── models/          # 9 model Sequelize
├── controllers/     # auth, page, article, destination, browse-destination,
│                    #   trip, geo, admin, chat
├── services/        # auth, gemini, geo, article, destination,
│                    #   browse-destination, trip, itinerarySchema, chat, health
├── middlewares/     # requireAuth, requireAdmin, requireAdminPage
├── routes/          # auth, page, admin.page, admin, article, destination,
│                    #   browse-destination, trip, geo, chat
├── utils/           # response.js (format response seragam)
├── seeders/         # admin default + destinasi & artikel dummy
├── test/            # unit test (node:test)
├── docs/            # spec & rencana implementasi
├── views/
│   ├── auth/        # login.html, register.html
│   ├── admin/       # dashboard.html + placeholder M2, M4
│   └── user/        # landing (M1), destinations (M3), planner + trip + chat (M5)
└── public/
    ├── css/         # articles.css
    ├── js/          # include-partials, navbar-auth, auth, articles,
    │                #   admin-destinations, chat, planner, trip-map, geo-client
    └── partials/    # navbar-admin, sidebar-admin, navbar-user
```

## Cara kerja navbar/sidebar (penting sebelum nambah halaman)

Karena `views/` pakai HTML biasa (bukan EJS), navbar/sidebar nggak bisa
`<%- include(...) %>`. Solusinya: elemen `<div data-include="/partials/xxx.html">`
otomatis diisi isi file itu lewat `public/js/include-partials.js`
(fetch + inject ke DOM). Jadi tiap halaman baru, copy pola ini:

```html
<div data-include="/partials/navbar-user.html"></div>
<main class="container py-4">
  <h1>Halaman Baru</h1>
</main>
<script src="/js/include-partials.js"></script>
<script src="/js/navbar-auth.js"></script>
```

## Cara nambah endpoint API baru

Ikutin pola yang udah ada di `auth.*` atau `trip.*`:

1. `services/<nama>.service.js` — logic bisnis, query ke model
2. `controllers/<nama>.controller.js` — validasi input, panggil service,
   balikin lewat `sendResponse()`
3. `routes/<nama>.routes.js` — daftarin path + method + middleware
4. Mount di `app.js`: `app.use('/api/<nama>', require('./routes/<nama>.routes'))`

## Endpoint M2, M3 & M4

| Method | Endpoint | Proteksi | Modul |
|---|---|---|---|
| GET | `/api/articles` | publik | M2 |
| GET | `/api/articles/:id` | publik | M2 |
| POST | `/api/articles` | admin | M2 |
| PUT | `/api/articles/:id` | admin | M2 |
| DELETE | `/api/articles/:id` | admin | M2 |
| POST | `/api/articles/generate-caption` | admin | M2 |
| POST | `/api/ai/destination-finder` | publik | M3 |
| GET | `/api/destinations` | publik | M4 |
| GET | `/api/destinations/stats` | publik | M4 |
| GET | `/api/destinations/:id` | publik | M4 |
| POST | `/api/destinations` | admin | M4 |
| PUT | `/api/destinations/:id` | admin | M4 |
| DELETE | `/api/destinations/:id` | admin | M4 |
| POST | `/api/destinations/ai-description` | admin | M4 |

Baca (`GET`) sengaja dibuka tanpa login: landing page (M1) dan halaman
browse (M3) perlu menampilkan artikel & destinasi ke pengunjung yang
belum punya akun. Tulis/ubah/hapus tetap khusus admin.

Catatan M4: kolom `lat`/`lng` boleh dikosongkan saat menyimpan destinasi
— server otomatis mencarinya ke OpenStreetMap dari nama + kota. Kalau
tidak ketemu, destinasi tetap tersimpan tapi ditandai "belum dipetakan".

## Fitur M5 — Perencana Rute Wisata

Halaman: `/planner` (form + daftar rencana) dan `/trip/:id` (itinerary +
peta). Halamannya publik, tapi endpoint-nya butuh LOGIN — kalau belum
login yang muncul ajakan login, bukan formnya.

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/trips/generate` | buat trip + itinerary versi 1 |
| GET | `/api/trips` | daftar rencana milik user yang login |
| GET | `/api/trips/:id` | detail + itinerary versi terbaru |
| GET | `/api/trips/:id/versions` | daftar semua versi |
| PATCH | `/api/trips/:id` | ubah judul/tanggal/budget/preferensi |
| POST | `/api/trips/:id/regenerate` | buat versi baru |
| DELETE | `/api/trips/:id` | hapus trip + semua versinya |
| GET | `/api/geo/reverse?lat=&lng=` | koordinat → nama kota |

### Catatan teknis

- **Generate makan 20–60 detik.** Bukan hang: satu panggilan Gemini,
  lalu tiap tempat dicek ke Nominatim yang dibatasi 1 request/detik.
  Itinerary 3 hari × 3 aktivitas = ~9 request = ~10 detik hanya untuk
  verifikasi.
- **Durasi maksimal 14 hari.** Batas sadar: respons AI untuk 30 hari
  terlalu panjang (gampang kepotong) dan verifikasinya lebih dari 2 menit.
- **Kontrak JSON.** Gemini dipanggil dengan `responseSchema`, hasilnya
  tetap divalidasi ulang di `services/itinerarySchema.js` — schema cuma
  ngatur bentuk, bukan isi (AI tetap bisa ngasih 3 hari padahal diminta 5).
- **Verifikasi tempat.** Tiap tempat dicari ke OpenStreetMap. Ketemu →
  marker biru + lencana "✓ terverifikasi". Nggak ketemu tapi AI punya
  koordinat → marker oranye + "⚠️ belum terverifikasi". Dua-duanya gagal
  → nggak diplot. Ini mitigasi tempat halusinatif.
- **Versioning.** Regenerate bikin baris `itineraries` baru dengan
  `version` naik satu. Versi lama TIDAK dihapus.
- **Otorisasi.** Setiap query trip menyertakan `userId`. Trip milik orang
  lain dibalas **404**, bukan 403 — biar keberadaan sebuah ID nggak bocor.
- **Jarak & waktu tempuh** dihitung haversine di server (garis lurus,
  bukan rute jalan), waktu diperkirakan dengan asumsi 30 km/jam.

## Cara pakai Leaflet & geolocation

Leaflet dimuat lewat CDN unpkg dengan versi di-pin + `integrity` (lihat
`views/user/trip.html`). Contoh pemakaian lengkap ada di
`public/js/trip-map.js`: bikin peta, marker bernomor pakai `L.divIcon`,
polyline, dan `fitBounds`.

**Kasus tepi yang gampang bikin error:** kalau nggak ada satu pun titik
berkoordinat, jangan panggil `fitBounds` — `getBounds()` pada layer
kosong melempar error dan mematikan seluruh script.

Geolocation dibungkus di `public/js/geo-client.js`:

```html
<script src="/js/geo-client.js"></script>
```

```js
try {
  const posisi = await GeoClient.minta();          // {lat, lng}
  const lokasi = await GeoClient.reverse(posisi.lat, posisi.lng); // {city, displayName}
} catch (err) {
  // err.message udah berupa kalimat yang bisa langsung ditampilin
}
```

Perlakukan geolocation sebagai **fitur tambahan**: user berhak menolak
izin, browsernya bisa nggak dukung, dan Chrome cuma mengizinkannya di
`https` atau `localhost`. Halaman harus tetap berfungsi penuh tanpanya.

> Jangan panggil Nominatim langsung dari browser. Nominatim minta
> maksimal 1 request/detik + `User-Agent` yang jelas, dan itu cuma bisa
> ditegakkan di server. Pakai `/api/geo/reverse` atau
> `services/geo.service.js`.

## Fitur M5 — Asisten Perjalanan + Identifikasi Tempat

Halaman: `/chat`. Admin juga bisa pakai (link ada di sidebar admin),
karena endpoint-nya diproteksi `requireAuth`, bukan `requireAdmin`.

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/chat/history` | riwayat obrolan user yang lagi login |
| POST | `/api/chat` | kirim pesan teks, balas pakai Gemini (multi-turn) |
| POST | `/api/chat/detect` | kirim foto tempat, balas identifikasi + tips |
| DELETE | `/api/chat/history` | reset obrolan |

- Riwayat disimpan di `chat_messages`. 20 pesan terakhir dikirim balik ke
  Gemini tiap request supaya AI nyambung — Gemini nggak nyimpen konteks
  di sisi mereka.
- Foto di-resize di BROWSER (maksimal 1024px, JPEG) sebelum dikirim
  sebagai base64, jadi upload dari HP nggak lama.
- Foto **tidak** disimpan ke database (bikin bengkak), cuma hasil
  analisanya. Baris dari foto ditandai kolom `hasImage`.

## Cara pakai Gemini AI (buat M1, M2, M3, M4)

Semua fitur AI pakai API key yang sama (`GEMINI_API_KEY` di `.env`).

`services/gemini.service.js` **udah dibikin**, jadi jangan bikin koneksi
Gemini sendiri — tinggal import dari situ (DRY):

```js
const gemini = require('../services/gemini.service');

// sekali jalan, output teks (M2 caption, M4 deskripsi, M1 narasi cuaca)
const teks = await gemini.generate({
  contents: 'Bikinin 3 caption buat artikel wisata ini: ...',
  systemInstruction: 'Kamu editor konten wisata.',
});

// multi-turn / ada riwayat (M5 chat)
const balasan = await gemini.chat({ history, message, systemInstruction });

// output JSON TERSTRUKTUR (M3 quiz, M5 itinerary)
const data = await gemini.generateJson({
  prompt: 'Rekomendasikan 3 kategori destinasi buat orang yang suka ...',
  responseSchema: {
    type: 'object',
    properties: {
      rekomendasi: { type: 'array', items: { type: 'string' } },
    },
    required: ['rekomendasi'],
  },
});
```

`generateJson()` jauh lebih andal daripada nulis "BALAS DENGAN JSON SAJA"
di prompt — instruksi kayak gitu gampang dilanggar (model suka nambahin
` ```json ` di depan). Tapi tetap validasi hasilnya sendiri: schema cuma
ngatur bentuk, bukan isi.

Tambah fungsi baru (`generateCaption()`, `generateDescription()`, dst) di
file yang sama, jangan bikin client Gemini baru.

> ⚠️ **Catatan versi `@google/genai`**: `package.json` awalnya pin ke
> `^0.5.0`, tapi versi 0.5.0 yang ada di npm itu rusak (tarball-nya nggak
> berisi file JS sama sekali, jadi `require('@google/genai')` langsung
> error `MODULE_NOT_FOUND`). Udah dinaikin ke `^0.6.1` biar semua fitur
> AI bisa jalan. Kalau habis `git pull` masih error modul, jalanin
> `npm install` lagi.

## Test

```bash
npm test
```

Pakai `node:test` bawaan Node 18+ — **nol dependency tambahan**. Yang
diuji cuma logika murni yang rawan salah dan bisa diuji tanpa jaringan:
validator kontrak JSON dan perhitungan jarak. Detail & alasannya ada di
[`test/README.md`](./test/README.md).

## Dokumen rancangan

- [`PRD.md`](./PRD.md) — kebutuhan, skema database, pembagian kerja
- [`docs/diagrams/`](./docs/diagrams/) — **diagram Mermaid**: use case,
  activity, class, sequence, dan ERD (masing-masing tersedia sebagai
  `.md` untuk pratinjau, `.mmd` untuk diedit, dan `.png` siap tempel)
- [`docs/superpowers/specs/`](./docs/superpowers/specs/) — desain teknis
- [`docs/superpowers/plans/`](./docs/superpowers/plans/) — rencana implementasi
