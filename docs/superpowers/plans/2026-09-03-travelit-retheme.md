# TrAvelIt Retheme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah repo Final Project PDW dari tema "Tani Makmur" (toko bahan pertanian) menjadi "TrAvelIt" (AI Travel Planner), dengan modul M5 diimplementasi penuh: generate itinerary via Gemini JSON, verifikasi tempat via Nominatim, peta Leaflet, dan geolocation browser.

**Architecture:** Express mengorkestrasi semuanya. `trip.service` memanggil Gemini untuk satu itinerary utuh berbentuk JSON, memvalidasinya lewat `itinerarySchema`, memverifikasi tiap tempat lewat `geo.service` (Nominatim), lalu menyimpan `trip → itinerary(versi) → itinerary_days → activities` dalam satu transaksi Sequelize. Regenerate menambah baris versi baru, tidak menimpa. Frontend HTML/Bootstrap menampilkan itinerary per hari plus peta Leaflet.

**Tech Stack:** Node 22, Express 4, Sequelize 6 + SQLite, `@google/genai`, Leaflet 1.9.4 (CDN unpkg), OpenStreetMap Nominatim (geocoding, tanpa API key), Bootstrap 5.3 (CDN), `node:test` (test runner bawaan Node, tanpa dependency baru).

**Spec:** `docs/superpowers/specs/2026-09-03-travelit-retheme-design.md`

## Global Constraints

- Nama aplikasi ditulis persis **`TrAvelIt`** (huruf A dan I kapital). Tidak boleh ada varian "Travelit", "TravelIt", atau "TRAVELIT" di kode maupun dokumentasi.
- Tidak boleh ada sisa string `Tani Makmur`, `tanimakmur`, `tani-makmur`, atau istilah pertanian (`pertanian`, `petani`, `hama`, `pupuk`, `bibit`, `tanam`, `panen`) di seluruh repo setelah Task 12.
- Tech stack tidak diganti: tetap Express + SQLite/Sequelize + HTML/Bootstrap + Gemini. Tidak menambah framework frontend, template engine, atau ORM lain.
- **Tidak menambah dependency npm baru.** Leaflet lewat CDN, Nominatim lewat `fetch` bawaan Node 22, test lewat `node:test`.
- Semua endpoint `/api/trips/*` wajib `requireAuth`, dan setiap query trip wajib menyertakan `userId` pemilik. Trip milik user lain membalas **404**, bukan 403.
- Bahasa UI dan komentar kode: Bahasa Indonesia santai, konsisten dengan gaya kode yang sudah ada di repo.
- Format response API selalu lewat `sendResponse(res, {code, success, message, data})` dari `utils/response.js`.
- Nominatim: wajib header `User-Agent` yang jelas, maksimal 1 request/detik.
- Mata uang default `IDR`, biaya disimpan sebagai INTEGER rupiah (bukan desimal).

---

## File Structure

**Dibuat:**

| File | Tanggung jawab |
| --- | --- |
| `models/trip.model.js` | Tabel `trips` |
| `models/preference.model.js` | Tabel `preferences` (1:1 trip) |
| `models/itinerary.model.js` | Tabel `itineraries` (versi) |
| `models/itineraryDay.model.js` | Tabel `itinerary_days` |
| `models/activity.model.js` | Tabel `activities` |
| `models/destination.model.js` | Tabel `destinations` (jatah M3/M4) |
| `models/article.model.js` | Tabel `articles` (jatah M1/M2) |
| `services/itinerarySchema.js` | Kontrak + validator JSON dari Gemini. Murni fungsi, tanpa I/O |
| `services/geo.service.js` | Nominatim (geocode/reverse) + haversine + antrian + cache |
| `services/trip.service.js` | Orkestrasi generate/regenerate + persistensi transaksional |
| `controllers/trip.controller.js` | Validasi input HTTP untuk `/api/trips/*` |
| `routes/trip.routes.js` | Pendaftaran rute `/api/trips/*` |
| `controllers/geo.controller.js` | Endpoint reverse geocode |
| `routes/geo.routes.js` | Pendaftaran rute `/api/geo/*` |
| `controllers/admin.controller.js` | Statistik agregat admin |
| `routes/admin.routes.js` | Pendaftaran rute `/api/admin/*` |
| `views/user/planner.html` | Form preferensi + daftar trip |
| `views/user/trip.html` | Detail itinerary + peta |
| `public/js/planner.js` | Logic halaman planner |
| `public/js/trip-map.js` | Logic halaman detail trip + Leaflet |
| `public/js/geo-client.js` | Helper geolocation browser, dipakai bersama |
| `test/itinerarySchema.test.js` | Test validator |
| `test/geo.test.js` | Test haversine + normalisasi query |

**Diubah nama:**

| Dari | Menjadi |
| --- | --- |
| `views/user/products.html` | `views/user/destinations.html` |
| `views/admin/products.html` | `views/admin/destinations.html` |
| `views/admin/news.html` | `views/admin/articles.html` |

**Dimodifikasi:** `.env`, `.env.example`, `package.json`, `config/env.js`, `models/index.js`, `services/gemini.service.js`, `services/chat.service.js`, `controllers/page.controller.js`, `routes/page.routes.js`, `routes/admin.page.routes.js`, `app.js`, `seeders/seed.js`, seluruh file di `views/`, `public/partials/*.html`, `public/js/chat.js`, `PRD.md`, `README.md`, dan 12 file `README.md` di tiap folder.

---

## Urutan Task

| # | Task | Bisa diuji lewat |
| --- | --- | --- |
| 1 | Fondasi penamaan & konfigurasi | `npm run seed`, grep |
| 2 | Model domain baru + asosiasi | script sync + assert tabel |
| 3 | Validator kontrak itinerary | `node --test` |
| 4 | `geo.service` | `node --test` + probe manual |
| 5 | `gemini.service.generateJson()` | probe manual |
| 6 | `trip.service` | script end-to-end |
| 7 | Endpoint trip + geo + admin stats | curl |
| 8 | Rute halaman & rename view | buka browser |
| 9 | Halaman planner | browser |
| 10 | Halaman detail trip + peta | browser |
| 11 | Retheme chat M5 | browser |
| 12 | Dokumentasi + sapu bersih | grep + baca |

---

### Task 1: Fondasi penamaan & konfigurasi

**Files:**
- Modify: `package.json`
- Modify: `config/env.js`
- Modify: `.env.example`
- Modify: `.env`
- Modify: `seeders/seed.js`

**Interfaces:**
- Consumes: —
- Produces: `config.appName` (string, default `'TrAvelIt'`), `config.geminiModel`, `config.nominatimUserAgent` (string), `config.nominatimBaseUrl` (string). Script npm baru: `npm test`, `npm run db:reset`.

- [ ] **Step 1: Ganti metadata & script di `package.json`**

Ubah `description` dan tambahkan dua script. Sisanya (dependencies) tidak disentuh — ingat Global Constraint: tidak ada dependency baru.

```json
{
  "name": "final-project-pdw",
  "version": "1.0.0",
  "description": "Final Project PDW - TrAvelIt, AI Travel Planner. Express + SQLite + HTML/Bootstrap + Gemini AI + Leaflet",
  "main": "app.js",
  "type": "commonjs",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "seed": "node seeders/seed.js",
    "test": "node --test test/",
    "db:reset": "node -e \"require('fs').rmSync(process.env.DB_STORAGE||'./database.sqlite',{force:true})\" && npm run seed"
  }
}
```

- [ ] **Step 2: Tambah konfigurasi Nominatim di `config/env.js`**

`storeName` diganti `appName`. Dua konstanta Nominatim ditaruh di sini (bukan hardcode di service) mengikuti aturan `config/README.md`: semua env dibaca dari satu tempat.

```js
require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  appName: process.env.APP_NAME || 'TrAvelIt',
  sessionSecret: process.env.SESSION_SECRET || 'secret-default-ganti-ini',
  dbStorage: process.env.DB_STORAGE || './database.sqlite',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
  weatherApiKey: process.env.WEATHER_API_KEY,

  // Nominatim (OpenStreetMap) dipakai buat verifikasi tempat & reverse
  // geocode. Gratis, gak butuh API key, TAPI wajib kirim User-Agent yang
  // jelas + maksimal 1 request/detik - itu syarat pemakaiannya, bukan
  // saran. Liat services/geo.service.js.
  nominatimBaseUrl: process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org',
  nominatimUserAgent: process.env.NOMINATIM_USER_AGENT || 'TrAvelIt/1.0 (final project PDW)',
};

module.exports = config;
```

- [ ] **Step 3: Tulis ulang `.env.example`**

```bash
# ====================================================================
# SERVER
# ====================================================================
PORT=3000
APP_NAME=TrAvelIt

# session buat login (admin & user pake mekanisme yang sama)
SESSION_SECRET=ganti-dengan-secret-random-punya-kalian

# ====================================================================
# DATABASE (SQLite - otomatis kebuat sendiri, gak perlu setup apa-apa)
# ====================================================================
DB_STORAGE=./database.sqlite

# ====================================================================
# GEMINI AI - dipake di:
# - M1: narasiin rekomendasi waktu berkunjung (dikombinasi data cuaca)
# - M2: rekomendasi caption artikel wisata
# - M3: AI destination finder (quiz)
# - M4: rekomendasi deskripsi destinasi
# - M5: generate itinerary (JSON), chat asisten perjalanan,
#       identifikasi tempat dari foto
# Ambil gratis di https://aistudio.google.com/app/apikey
# SEMUA mahasiswa pake API key yang SAMA (1 aja per tim/project)
# ====================================================================
GEMINI_API_KEY=isi-api-key-kalian-disini
GEMINI_MODEL=gemini-3.7-flash

# ====================================================================
# WEATHER API - dipake M1 (cuaca di kota tujuan)
# Contoh: OpenWeatherMap (https://openweathermap.org/api), gratis tier ada
# ====================================================================
WEATHER_API_KEY=isi-api-key-cuaca-disini

# ====================================================================
# NOMINATIM (OpenStreetMap) - dipake M5 buat verifikasi koordinat tempat
# & reverse geocode tombol "pakai lokasi saya".
# GAK BUTUH API KEY. Dua baris di bawah biasanya gak perlu diubah -
# cuma diisi kalau kalian nge-host instance Nominatim sendiri.
# Wajib pakai User-Agent yang jelas (syarat pemakaian Nominatim).
# ====================================================================
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
NOMINATIM_USER_AGENT=TrAvelIt/1.0 (final project PDW)
```

- [ ] **Step 4: Sinkronkan `.env` yang sudah ada**

Jangan tulis ulang `.env` dari nol — di situ ada API key asli milik user. Ubah **hanya** baris yang perlu, pertahankan nilai `GEMINI_API_KEY` dan `WEATHER_API_KEY` apa adanya:

```bash
cd "D:/KULIAH/ANTARA2025/PDW/Final-Project-PDW"
sed -i 's/^STORE_NAME=.*/APP_NAME=TrAvelIt/' .env
sed -i 's/^SESSION_SECRET=.*/SESSION_SECRET=travelit-dev-secret-local/' .env
sed -i 's/^GEMINI_MODEL=.*/GEMINI_MODEL=gemini-3.7-flash/' .env
sed -i 's/Tani Makmur/TrAvelIt/g; s/pertanian/wisata/g' .env
printf '\n# Nominatim (OpenStreetMap) - gak butuh API key\nNOMINATIM_BASE_URL=https://nominatim.openstreetmap.org\nNOMINATIM_USER_AGENT=TrAvelIt/1.0 (final project PDW)\n' >> .env
```

Lalu buka `.env` dan pastikan komentar blok GEMINI/WEATHER-nya sudah masuk akal untuk tema baru; rapikan manual kalau `sed` menghasilkan kalimat janggal.

- [ ] **Step 5: Perbarui seeder admin di `seeders/seed.js`**

Untuk sekarang cukup akun admin; data destinasi & artikel dummy ditambahkan di Task 2 setelah modelnya ada.

```js
    const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
    const [admin] = await User.findOrCreate({
      where: { email: 'admin@travelit.com' },
      defaults: { name: 'Admin TrAvelIt', password: hashedPassword, role: 'admin' },
    });

    console.log('Admin siap:', admin.email);
    console.log('Login admin: email=admin@travelit.com password=admin123');
```

- [ ] **Step 6: Jalankan seeder & verifikasi**

Run: `npm run seed`
Expected: keluar `Login admin: email=admin@travelit.com password=admin123` lalu `Seeding selesai`.

Run: `grep -rn "STORE_NAME\|storeName" --include=*.js --include=*.html --include=*.md . | grep -v node_modules`
Expected: tidak ada hasil kecuali di `public/partials/*.html` (atribut `data-store-name`, dibereskan di Task 8).

- [ ] **Step 7: Commit**

```bash
git add package.json config/env.js .env.example seeders/seed.js
git commit -m "chore: ganti konfigurasi dasar Tani Makmur jadi TrAvelIt"
```

Catatan: `.env` sengaja tidak di-`git add` — file itu ada di `.gitignore` dan berisi API key.

---

### Task 2: Model domain baru + asosiasi

**Files:**
- Create: `models/trip.model.js`, `models/preference.model.js`, `models/itinerary.model.js`, `models/itineraryDay.model.js`, `models/activity.model.js`, `models/destination.model.js`, `models/article.model.js`
- Modify: `models/index.js`
- Modify: `seeders/seed.js`

**Interfaces:**
- Consumes: `config` dari Task 1.
- Produces: `require('../models')` mengekspor `{ sequelize, User, ChatMessage, Trip, Preference, Itinerary, ItineraryDay, Activity, Destination, Article }`. Nama tabel: `trips`, `preferences`, `itineraries`, `itinerary_days`, `activities`, `destinations`, `articles`. Konstanta `Trip.STATUS = { DRAFT:'draft', GENERATED:'generated', FAILED:'failed' }`.

- [ ] **Step 1: Buat `models/trip.model.js`**

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Satu baris = satu rencana perjalanan punya user. Isinya cuma
 * PERMINTAAN-nya (mau ke mana, kapan, budget berapa) - hasil itinerary
 * dari AI disimpan terpisah di tabel `itineraries`, soalnya satu trip
 * bisa punya beberapa versi itinerary (tiap kali di-regenerate).
 *
 * `durationDays` sebenernya bisa dihitung dari startDate-endDate, tapi
 * sengaja disimpen juga biar gak perlu ngitung tanggal tiap kali mau
 * nampilin daftar trip, dan biar validator itinerary gampang ngecek
 * "jumlah hari dari AI cocok gak sama durasi yang diminta".
 */
const Trip = sequelize.define(
  'Trip',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false }, // FK -> users.id
    title: { type: DataTypes.STRING, allowNull: false },
    destination: { type: DataTypes.STRING, allowNull: false },
    originCity: { type: DataTypes.STRING, allowNull: true }, // boleh dari geolocation
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    durationDays: { type: DataTypes.INTEGER, allowNull: false },
    budget: { type: DataTypes.INTEGER, allowNull: false }, // rupiah, total semua orang
    travelerCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    // 'draft'    = baru dibuat, itinerary belum ada
    // 'generated'= punya minimal 1 versi itinerary
    // 'failed'   = AI gagal / hasilnya gak lolos validasi
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
    // pesan error terakhir kalau status 'failed', biar user tau kenapa
    lastError: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: 'trips', timestamps: true }
);

Trip.STATUS = { DRAFT: 'draft', GENERATED: 'generated', FAILED: 'failed' };

module.exports = Trip;
```

- [ ] **Step 2: Buat `models/preference.model.js`**

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Preferensi perjalanan, 1 baris per trip. Dipisah dari tabel `trips`
 * (bukan digabung jadi kolom tambahan) ngikutin rancangan di PRD:
 * identitas trip (tujuan, tanggal) itu fakta yang jarang berubah,
 * sedangkan preferensi ini yang sering diutak-atik pas user pengen
 * hasil yang beda terus nge-regenerate.
 *
 * `interests` disimpen sebagai JSON string karena SQLite gak punya tipe
 * array. Jangan diakses langsung - pake getter `interestList` di bawah
 * biar pemanggilnya gak perlu tau soal JSON.parse.
 */
const Preference = sequelize.define(
  'Preference',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tripId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    interests: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
    // seberapa padat jadwalnya: santai (2-3 aktivitas/hari),
    // sedang (4), padat (5-6)
    pace: { type: DataTypes.STRING, allowNull: false, defaultValue: 'sedang' },
    specialNeeds: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'preferences',
    timestamps: true,
    getterMethods: {
      interestList() {
        try {
          const parsed = JSON.parse(this.getDataValue('interests') || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      },
    },
  }
);

Preference.PACE = ['santai', 'sedang', 'padat'];

module.exports = Preference;
```

- [ ] **Step 3: Buat `models/itinerary.model.js`**

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Satu baris = SATU VERSI itinerary utuh hasil generate AI.
 *
 * Aturan pentingnya (dari rancangan sistem): regenerate BIKIN VERSI
 * BARU, bukan nimpa yang lama. Jadi user bisa bandingin hasil lama vs
 * baru, dan riwayatnya gak ilang. Versi yang ditampilin = `version`
 * paling gede buat trip itu.
 *
 * `modelUsed` & `generatedAt` disimpen karena estimasi biaya dari AI
 * bisa berubah seiring waktu - dengan nyimpen kapan & pake model apa,
 * angkanya bisa dijelasin sebagai "estimasi per tanggal sekian".
 */
const Itinerary = sequelize.define(
  'Itinerary',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tripId: { type: DataTypes.INTEGER, allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    totalEstimatedCost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'IDR' },
    modelUsed: { type: DataTypes.STRING, allowNull: true },
    generatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'itineraries',
    timestamps: true,
    indexes: [{ fields: ['tripId', 'version'] }],
  }
);

module.exports = Itinerary;
```

- [ ] **Step 4: Buat `models/itineraryDay.model.js`**

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/** Satu hari dalam satu versi itinerary. */
const ItineraryDay = sequelize.define(
  'ItineraryDay',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    itineraryId: { type: DataTypes.INTEGER, allowNull: false },
    dayNumber: { type: DataTypes.INTEGER, allowNull: false }, // 1..n
    date: { type: DataTypes.DATEONLY, allowNull: true },
    summary: { type: DataTypes.STRING, allowNull: true }, // judul singkat hari itu
  },
  { tableName: 'itinerary_days', timestamps: true }
);

module.exports = ItineraryDay;
```

- [ ] **Step 5: Buat `models/activity.model.js`**

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Satu aktivitas dalam satu hari (kunjungan tempat, makan, pindah kota).
 *
 * Soal `placeVerified`: koordinat dari AI itu gak selalu bener - model
 * bahasa bisa aja ngarang tempat yang gak ada ("halusinasi"). Makanya
 * tiap tempat dicek ulang ke Nominatim (OpenStreetMap). Kalo ketemu,
 * koordinatnya dipake dari Nominatim dan ditandai terverifikasi. Kalo
 * nggak, koordinat tebakan AI tetep dipake tapi ditandai BELUM
 * terverifikasi, dan UI ngasih lencana peringatan - jadi user tau mana
 * yang perlu dicek sendiri.
 *
 * `distanceKmFromPrev` & `travelMinutesFromPrev` dihitung di server dari
 * koordinat aktivitas sebelumnya (haversine), BUKAN dari AI - angka
 * jarak dari AI gampang ngaco, sedangkan haversine itu pasti.
 */
const Activity = sequelize.define(
  'Activity',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    itineraryDayId: { type: DataTypes.INTEGER, allowNull: false },
    orderNo: { type: DataTypes.INTEGER, allowNull: false },
    startTime: { type: DataTypes.STRING, allowNull: true }, // "09:00"
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false, defaultValue: 'lainnya' },
    description: { type: DataTypes.TEXT, allowNull: true },
    estimatedCost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lat: { type: DataTypes.FLOAT, allowNull: true },
    lng: { type: DataTypes.FLOAT, allowNull: true },
    placeVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    distanceKmFromPrev: { type: DataTypes.FLOAT, allowNull: true },
    travelMinutesFromPrev: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'activities', timestamps: true }
);

Activity.CATEGORIES = ['wisata', 'kuliner', 'transport', 'penginapan', 'lainnya'];

module.exports = Activity;
```

- [ ] **Step 6: Buat `models/destination.model.js`**

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Katalog destinasi wisata yang dikurasi admin (jatah M4 buat CRUD-nya,
 * M3 buat halaman browse-nya). Ini menggantikan tabel `products` dari
 * tema lama.
 *
 * `lat`/`lng` ada di sini supaya destinasi bisa langsung diplot di peta
 * Leaflet tanpa perlu geocoding ulang tiap kali halaman dibuka.
 */
const Destination = sequelize.define(
  'Destination',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false }, // pantai, gunung, budaya, kuliner, taman
    city: { type: DataTypes.STRING, allowNull: false },
    province: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true }, // manual atau dibantu AI (M4)
    ticketPrice: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lat: { type: DataTypes.FLOAT, allowNull: true },
    lng: { type: DataTypes.FLOAT, allowNull: true },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true }, // FK -> users.id (admin)
  },
  { tableName: 'destinations', timestamps: true }
);

Destination.CATEGORIES = ['pantai', 'gunung', 'budaya', 'kuliner', 'taman', 'lainnya'];

module.exports = Destination;
```

- [ ] **Step 7: Buat `models/article.model.js`**

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Artikel / tips wisata yang ditulis admin (M2 buat CRUD + AI caption,
 * M1 buat nampilin di landing page). Menggantikan tabel `news` dari
 * tema lama.
 */
const Article = sequelize.define(
  'Article',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    caption: { type: DataTypes.STRING, allowNull: true }, // ringkasan pendek, bisa dibantu AI (M2)
    content: { type: DataTypes.TEXT, allowNull: false },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true }, // FK -> users.id (admin)
  },
  { tableName: 'articles', timestamps: true }
);

module.exports = Article;
```

- [ ] **Step 8: Rangkai asosiasi di `models/index.js`**

`onDelete: 'CASCADE'` dipasang berantai supaya hapus trip ikut membersihkan seluruh versi itinerary, hari, dan aktivitasnya — tanpa itu, tabel `activities` bakal penuh baris yatim.

```js
const sequelize = require('../config/database');
const User = require('./user.model');
const ChatMessage = require('./chatMessage.model'); // M5
const Trip = require('./trip.model'); // M5
const Preference = require('./preference.model'); // M5
const Itinerary = require('./itinerary.model'); // M5
const ItineraryDay = require('./itineraryDay.model'); // M5
const Activity = require('./activity.model'); // M5
const Destination = require('./destination.model'); // M3, M4
const Article = require('./article.model'); // M1, M2

// riwayat chat nempel ke user yang login (1 user punya banyak pesan)
User.hasMany(ChatMessage, { foreignKey: 'userId', onDelete: 'CASCADE' });
ChatMessage.belongsTo(User, { foreignKey: 'userId' });

// Rantai kepemilikan trip:
//   user -> trip -> itinerary(versi) -> hari -> aktivitas
// CASCADE dipasang di TIAP tingkat, bukan cuma di paling atas, soalnya
// SQLite gak otomatis nurunin cascade lintas beberapa level.
User.hasMany(Trip, { foreignKey: 'userId', onDelete: 'CASCADE' });
Trip.belongsTo(User, { foreignKey: 'userId' });

Trip.hasOne(Preference, { foreignKey: 'tripId', as: 'preference', onDelete: 'CASCADE' });
Preference.belongsTo(Trip, { foreignKey: 'tripId' });

Trip.hasMany(Itinerary, { foreignKey: 'tripId', as: 'itineraries', onDelete: 'CASCADE' });
Itinerary.belongsTo(Trip, { foreignKey: 'tripId' });

Itinerary.hasMany(ItineraryDay, { foreignKey: 'itineraryId', as: 'days', onDelete: 'CASCADE' });
ItineraryDay.belongsTo(Itinerary, { foreignKey: 'itineraryId' });

ItineraryDay.hasMany(Activity, { foreignKey: 'itineraryDayId', as: 'activities', onDelete: 'CASCADE' });
Activity.belongsTo(ItineraryDay, { foreignKey: 'itineraryDayId' });

// Konten kurasi admin. Pakai SET NULL, bukan CASCADE: kalau akun admin
// dihapus, artikel & destinasinya JANGAN ikut hilang - itu konten publik
// yang gak ada hubungannya sama nasib akun penulisnya.
User.hasMany(Destination, { foreignKey: 'createdBy', onDelete: 'SET NULL' });
Destination.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });

User.hasMany(Article, { foreignKey: 'createdBy', onDelete: 'SET NULL' });
Article.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });

module.exports = {
  sequelize,
  User,
  ChatMessage,
  Trip,
  Preference,
  Itinerary,
  ItineraryDay,
  Activity,
  Destination,
  Article,
};
```

- [ ] **Step 9: Tambah data dummy destinasi & artikel di `seeders/seed.js`**

Data dummy ini penting: M1 dan M3 butuh isi tabel untuk mulai kerja tanpa menunggu M2/M4 selesai CRUD. Koordinatnya diisi supaya bisa langsung diplot di peta. Sisipkan setelah blok admin, sebelum `console.log('\nSeeding selesai')`:

```js
    const destinasiDummy = [
      { name: 'Pantai Kuta', category: 'pantai', city: 'Badung', province: 'Bali', ticketPrice: 0, lat: -8.7184, lng: 115.1686, description: 'Pantai berpasir putih dengan ombak yang ramah buat pemula selancar.' },
      { name: 'Candi Borobudur', category: 'budaya', city: 'Magelang', province: 'Jawa Tengah', ticketPrice: 50000, lat: -7.6079, lng: 110.2038, description: 'Candi Buddha terbesar di dunia, paling cantik dilihat saat matahari terbit.' },
      { name: 'Gunung Bromo', category: 'gunung', city: 'Probolinggo', province: 'Jawa Timur', ticketPrice: 34000, lat: -7.9425, lng: 112.9530, description: 'Kaldera berpasir dengan panorama matahari terbit dari Penanjakan.' },
      { name: 'Malioboro', category: 'kuliner', city: 'Yogyakarta', province: 'DI Yogyakarta', ticketPrice: 0, lat: -7.7926, lng: 110.3656, description: 'Jalan legendaris buat wisata belanja dan kuliner angkringan malam hari.' },
      { name: 'Kawah Putih', category: 'taman', city: 'Bandung', province: 'Jawa Barat', ticketPrice: 35000, lat: -7.1660, lng: 107.4020, description: 'Danau kawah belerang dengan air kehijauan di ketinggian 2.400 mdpl.' },
      { name: 'Raja Ampat', category: 'pantai', city: 'Waisai', province: 'Papua Barat Daya', ticketPrice: 1000000, lat: -0.5897, lng: 130.1000, description: 'Gugusan karst di atas laut dengan terumbu karang terkaya di dunia.' },
    ];

    for (const d of destinasiDummy) {
      await Destination.findOrCreate({
        where: { name: d.name },
        defaults: { ...d, createdBy: admin.id },
      });
    }
    console.log(`Destinasi dummy siap: ${destinasiDummy.length} baris`);

    const artikelDummy = [
      {
        title: 'Cara Menyusun Itinerary yang Tidak Bikin Capek',
        caption: 'Tiga aktivitas sehari sudah cukup. Sisanya biarkan spontan.',
        content: 'Kesalahan paling umum saat menyusun rencana perjalanan adalah menjejalkan terlalu banyak tempat dalam satu hari...',
      },
      {
        title: 'Menghitung Budget Liburan Tanpa Kaget di Akhir',
        caption: 'Pisahkan biaya tetap dan biaya harian sejak awal.',
        content: 'Biaya tetap adalah tiket pesawat dan penginapan. Biaya harian adalah makan, transport lokal, dan tiket masuk...',
      },
      {
        title: 'Musim Terbaik Berkunjung ke Indonesia Timur',
        caption: 'April sampai Oktober, saat laut sedang tenang.',
        content: 'Indonesia Timur punya pola musim yang berbeda dengan Jawa. Untuk menyelam di Raja Ampat atau Komodo...',
      },
    ];

    for (const a of artikelDummy) {
      await Article.findOrCreate({
        where: { title: a.title },
        defaults: { ...a, createdBy: admin.id },
      });
    }
    console.log(`Artikel dummy siap: ${artikelDummy.length} baris`);
```

Jangan lupa ubah baris import di atas file:

```js
const { sequelize, User, Destination, Article } = require('../models');
```

- [ ] **Step 10: Verifikasi tabel benar-benar terbentuk**

```bash
cd "D:/KULIAH/ANTARA2025/PDW/Final-Project-PDW"
npm run db:reset
node -e "
const { sequelize } = require('./models');
sequelize.sync().then(async () => {
  const [rows] = await sequelize.query(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\");
  console.log(rows.map(r => r.name).join('\n'));
  process.exit(0);
});
"
```

Expected: daftar memuat `activities`, `articles`, `chat_messages`, `destinations`, `itineraries`, `itinerary_days`, `preferences`, `trips`, `users`. Tidak boleh ada `products` atau `news` (karena `db:reset` menghapus file lama).

- [ ] **Step 11: Commit**

```bash
git add models/ seeders/seed.js
git commit -m "feat: tambah model domain trip, itinerary, destination, article"
```

---

### Task 3: Validator kontrak itinerary

**Files:**
- Create: `services/itinerarySchema.js`
- Create: `test/itinerarySchema.test.js`

**Interfaces:**
- Consumes: `Activity.CATEGORIES` dari Task 2.
- Produces:
  - `RESPONSE_SCHEMA` — objek schema untuk parameter `responseSchema` Gemini.
  - `validateItinerary(raw, { durationDays })` → `{ ok: true, value: { destination, totalEstimatedCost, currency, days: [{ dayNumber, summary, activities: [{ orderNo, startTime, name, category, description, estimatedCost, lat, lng }] }] } }` atau `{ ok: false, errors: string[] }`
  - `normalizeCategory(value)` → salah satu dari `Activity.CATEGORIES`
  - `isValidCoordinate(lat, lng)` → boolean

Ini unit paling rawan di seluruh fitur — dia yang berdiri antara keluaran model bahasa dan database. Karena murni fungsi tanpa I/O, dia juga satu-satunya bagian yang bisa diuji sungguhan tanpa memanggil API. Karena itu Task 3 dikerjakan penuh dengan TDD.

**Aturan pemisah yang menentukan seluruh desain validator ini:**

- Yang bikin itinerary **tidak ada gunanya** → TOLAK: `days` kosong/bukan array, hari tanpa aktivitas, aktivitas tanpa nama, jumlah hari tidak sama dengan durasi trip.
- Yang cuma bikin **jelek tapi masih kepakai** → BETULKAN diam-diam: kategori tak dikenal → `lainnya`, jam format ngawur → `null`, koordinat mustahil → `null`, biaya negatif → `0`, `dayNumber` acak → diurutkan ulang `1..n`.

Bedanya penting: kalau tiap hal kecil bikin gagal, user ketemu error terus padahal itinerary-nya sebenarnya sudah bagus.

- [ ] **Step 1: Tulis test yang gagal**

Buat `test/itinerarySchema.test.js` berisi 13 test dengan helper `itineraryValid(jumlahHari)` yang menghasilkan objek benar, lalu tiap test merusak satu aspek:

| Test | Harapan |
| --- | --- |
| itinerary lengkap & sesuai durasi | `ok === true`, `days.length === 2`, `lat` terbawa |
| jumlah hari ≠ durasi trip | `ok === false`, error memuat "jumlah hari" |
| `days` kosong / bukan array / `raw` null | `ok === false` (3 assertion) |
| hari tanpa aktivitas | `ok === false`, error memuat "aktivitas" |
| aktivitas tanpa `name` | `ok === false`, error memuat "nama" |
| kategori `'paralayang-ekstrem'` | `ok === true`, kategori jadi `'lainnya'` |
| koordinat `lat: 999` | `ok === true`, `lat` jadi `null` |
| `estimatedCost: -5000` | jadi `0` |
| `totalEstimatedCost: 0` padahal aktivitas 100000 | total jadi `100000` |
| `dayNumber` dikirim `[2, 1]` | hasil `[1, 2]` |
| `startTime: 'pagi-pagi banget'` | jadi `null` |
| `normalizeCategory` sinonim | `'Kuliner'`→`kuliner`, `'hotel'`→`penginapan`, `undefined`→`lainnya` |
| `isValidCoordinate` | `(-8.7,115.1)`→true; `(91,0)`, `(0,181)`, `(null,115)`, **`(0,0)`**→false |

Catatan `(0,0)`: titik itu di tengah Samudra Atlantik ("Null Island") dan hampir selalu berarti model gagal menebak koordinat, bukan bahwa tempatnya beneran di sana. Karena itu ditolak.

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

Run: `npm test`
Expected: FAIL — `Cannot find module '../services/itinerarySchema'`

- [ ] **Step 3: Implementasi `services/itinerarySchema.js`**

Struktur file, berurutan:

1. `KATEGORI_SAH = Activity.CATEGORIES` dan `PETA_SINONIM` (`hotel|menginap|akomodasi`→`penginapan`, `makan|makanan|restoran`→`kuliner`, `perjalanan|transportasi`→`transport`, `atraksi|rekreasi|belanja`→`wisata`).
2. `RESPONSE_SCHEMA` — bentuk JSON yang diminta ke Gemini: `{destination, totalEstimatedCost, currency, days[{dayNumber, summary, activities[{startTime, name, category, description, estimatedCost, coordinates{lat,lng}}]}]}`, dengan `required: ['destination','days']` di level atas dan `required: ['name','category','description','estimatedCost']` di aktivitas.
3. Helper privat: `bersihkanJam()` (regex `^([01]?\d|2[0-3]):([0-5]\d)$`, pad jadi `HH:MM`), `bersihkanBiaya()` (`Math.round`, negatif/NaN → 0), `bersihkanTeks(value, fallback)`.
4. `normalizeCategory()`, `isValidCoordinate()` sesuai tabel test di atas.
5. `validateItinerary()` — urutan kerjanya: guard `raw`/`days` → cek `days.length === durationDays` → sort `days` by `dayNumber` lalu tulis ulang nomornya `1..n` → per aktivitas: validasi nama (fatal), normalisasi sisanya → kumpulkan `errors` → kalau ada error kembalikan `{ok:false}` → hitung ulang total.

**Aturan total biaya:** total dari AI hanya dipercaya kalau `totalDariAi > 0 && totalDariAi >= totalDihitung`; selain itu pakai hasil penjumlahan sendiri. Alasannya angka yang bisa ditelusuri asalnya lebih berguna daripada angka yang enak dibaca. (Kondisi `>=` sengaja longgar: AI wajar menambahkan biaya yang tidak melekat di satu aktivitas, misalnya tiket pesawat.)

Semua komentar ditulis Bahasa Indonesia santai, mengikuti gaya `services/chat.service.js` yang sudah ada.

- [ ] **Step 4: Jalankan test, pastikan LULUS**

Run: `npm test`
Expected: 13 test PASS.

- [ ] **Step 5: Commit**

```bash
git add services/itinerarySchema.js test/itinerarySchema.test.js package.json
git commit -m "feat: tambah validator kontrak JSON itinerary + test"
```

---

### Task 4: `geo.service` — Nominatim & haversine

**Files:**
- Create: `services/geo.service.js`
- Create: `test/geo.test.js`

**Interfaces:**
- Consumes: `config.nominatimBaseUrl`, `config.nominatimUserAgent` dari Task 1.
- Produces:
  - `haversineKm(a, b)` → number km (2 desimal) atau `null`. `a`/`b` = `{lat, lng}`
  - `estimateTravelMinutes(km)` → number menit (minimal 5) atau `null`
  - `geocode(query)` → `Promise<{lat, lng, displayName} | null>`
  - `reverseGeocode(lat, lng)` → `Promise<{city, displayName} | null>`
  - `buildSearchQuery(nama, destinasi)` → string

- [ ] **Step 1: Tulis test yang gagal**

Buat `test/geo.test.js` — 9 test, **hanya fungsi murni**:

| Test | Harapan |
| --- | --- |
| Monas → Bundaran HI | antara 1,5 dan 2,5 km |
| titik identik | tepat `0` |
| titik tidak lengkap (`lat: null`, atau argumen `null`) | `null` |
| Jakarta → Surabaya | antara 600 dan 700 km |
| `estimateTravelMinutes(0.1)` dan `(0)` | `5` (batas bawah) |
| `estimateTravelMinutes(30) > (10)` | true |
| `estimateTravelMinutes(null)` | `null` |
| `buildSearchQuery('Pantai Kuta', 'Bali')` | `'Pantai Kuta, Bali'` |
| `buildSearchQuery('Pantai Kuta Bali', 'Bali')` | `'Pantai Kuta Bali'` (tidak dobel) |

`geocode`/`reverseGeocode` **tidak** di-mock. Yang berisiko di situ justru perilaku Nominatim asli — format respons dan rate limit — yang tidak akan tertangkap oleh mock buatan sendiri. Diuji lewat probe manual di Step 5.

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

Run: `npm test`
Expected: FAIL — `Cannot find module '../services/geo.service'`

- [ ] **Step 3: Implementasi `services/geo.service.js`**

Konstanta: `RADIUS_BUMI_KM = 6371`, `KECEPATAN_KOTA_KMJAM = 30`, `MENIT_MINIMUM = 5`, `JEDA_ANTAR_REQUEST_MS = 1100`, `TIMEOUT_MS = 8000`.

Tiga mekanisme yang wajib ada, masing-masing dengan alasannya:

1. **Antrian serial** — Nominatim membatasi 1 request/detik dan melanggarnya berujung blokir IP. Implementasinya rantai promise:

```js
let rantaiAntrean = Promise.resolve();

function antre(tugas) {
  const hasil = rantaiAntrean.then(tugas);
  rantaiAntrean = hasil
    .catch(() => {}) // kegagalan satu request gak boleh mematikan antrean
    .then(() => new Promise((r) => setTimeout(r, JEDA_ANTAR_REQUEST_MS)));
  return hasil;
}
```

`.catch(() => {})` itu bukan hiasan: tanpa itu, satu request gagal bikin `rantaiAntrean` jadi promise rejected dan **semua** request berikutnya ikut mati.

2. **Cache `Map`** — banyak aktivitas menyebut kota yang sama. Kunci `g:<query>` dan `r:<lat3desimal>,<lng3desimal>`. Umurnya seumur proses; ini penghemat request, bukan cache serius.

3. **Kegagalan ditelan jadi `null`, tidak dilempar** — di `panggilNominatim()`, blok `catch` mengembalikan `null`. Alasannya: gagal verifikasi lokasi **tidak boleh** menggagalkan generate itinerary. Aktivitasnya tetap dipakai, hanya tanpa titik peta.

Detail teknis lain:
- Header wajib: `'User-Agent': config.nominatimUserAgent` dan `'Accept-Language': 'id,en'`.
- Timeout via `AbortController` + `setTimeout`, dibersihkan di `finally`.
- Endpoint `/search` (params `q`, `limit=1`, `format=jsonv2`) dan `/reverse` (params `lat`, `lon`, `zoom=10`).
- Di `reverseGeocode`, nama kota diambil berurutan dari `address.city || town || municipality || county || state` — Nominatim menamai level administratif berbeda-beda per negara.
- `haversineKm` mengembalikan `Math.round(km * 100) / 100`.
- `buildSearchQuery` menempelkan destinasi kecuali nama tempat sudah memuatnya (case-insensitive).

- [ ] **Step 4: Jalankan test, pastikan LULUS**

Run: `npm test`
Expected: 9 test geo + 13 test schema PASS.

- [ ] **Step 5: Probe manual ke Nominatim asli**

```bash
node -e "
const geo = require('./services/geo.service');
(async () => {
  console.log('geocode :', await geo.geocode('Candi Borobudur, Magelang'));
  console.log('reverse :', await geo.reverseGeocode(-7.7926, 110.3656));
  console.log('ngawur  :', await geo.geocode('Tempat Yang Tidak Pernah Ada Xyzqw 12345'));
})();
"
```

Expected:
- `geocode` → `lat` sekitar `-7.6`, `lng` sekitar `110.2`
- `reverse` → `city` memuat "Yogyakarta"
- `ngawur` → `null` (bukan melempar error)
- Total sekitar 3 detik — itu bukti antrian 1 req/detik bekerja

Kalau ketiganya `null`, kemungkinan tidak ada internet. Catat dan lanjut; Task 6 memang dirancang tetap jalan tanpa geocoding.

- [ ] **Step 6: Commit**

```bash
git add services/geo.service.js test/geo.test.js
git commit -m "feat: tambah geo.service (Nominatim + haversine) beserta test"
```

---

### Task 5: `gemini.service.generateJson()`

**Files:**
- Modify: `services/gemini.service.js`

**Interfaces:**
- Consumes: `callWithRetry()` dan `getClient()` yang sudah ada di file itu.
- Produces: `generateJson({ prompt, systemInstruction, responseSchema })` → `Promise<object>`. Melempar `Error` kalau JSON tidak bisa di-parse setelah percobaan terakhir.

Fungsi ini **ditambahkan**, bukan menggantikan `generate()` atau `chat()` — keduanya masih dipakai fitur chat & foto M5, dan sudah dijanjikan ke M1–M4 lewat README.

- [ ] **Step 1: Tambahkan fungsi di bawah `chat()`**

```js
/**
 * Versi buat fitur yang butuh JSON TERSTRUKTUR, bukan prosa (dipake M5
 * buat generate itinerary).
 *
 * Bedanya sama `generate()`: `responseMimeType: 'application/json'` +
 * `responseSchema` bikin Gemini balikin JSON beneran, bukan teks yang
 * kebetulan mirip JSON. Ini jauh lebih andal daripada nulis "BALAS
 * DENGAN JSON SAJA" di prompt, yang gampang dilanggar (model suka
 * nambahin ```json ... ``` atau kalimat pembuka).
 *
 * Meski udah pake schema, hasilnya TETAP divalidasi lagi di
 * services/itinerarySchema.js. Schema cuma ngatur BENTUK-nya, gak bisa
 * ngatur ISI-nya - Gemini tetep bisa ngasih 3 hari padahal diminta 5.
 */
async function generateJson({ prompt, systemInstruction, responseSchema }) {
  const ai = getClient();

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: config.geminiModel,
      contents: prompt,
      config: {
        ...(systemInstruction ? { systemInstruction } : {}),
        responseMimeType: 'application/json',
        ...(responseSchema ? { responseSchema } : {}),
      },
    })
  );

  const text = (response.text || '').trim();
  if (!text) throw new Error('Gemini gak ngasih balasan, coba lagi');

  try {
    return JSON.parse(text);
  } catch {
    // Jaring pengaman: kalau model tetep bandel ngasih ```json ... ```
    // walau udah disuruh JSON mode, ambil kurung kurawal terluarnya aja.
    const awal = text.indexOf('{');
    const akhir = text.lastIndexOf('}');
    if (awal !== -1 && akhir > awal) {
      try {
        return JSON.parse(text.slice(awal, akhir + 1));
      } catch {
        /* jatuh ke error di bawah */
      }
    }
    throw new Error('Balasan AI bukan JSON yang valid');
  }
}
```

- [ ] **Step 2: Tambahkan ke `module.exports`**

```js
module.exports = { getClient, generate, chat, generateJson, callWithRetry };
```

- [ ] **Step 3: Perbarui komentar header file**

Blok komentar di atas file masih menyebut `generateCaption() -> M2` dan tema pertanian. Ganti daftar contohnya jadi tema wisata: `generateCaption()` → M2 (caption artikel wisata), `generateDescription()` → M4 (deskripsi destinasi), `recommendDestinations()` → M3.

- [ ] **Step 4: Probe manual**

```bash
node -e "
const gemini = require('./services/gemini.service');
gemini.generateJson({
  prompt: 'Sebutkan 2 kota di Indonesia beserta provinsinya.',
  responseSchema: {
    type: 'object',
    properties: { kota: { type: 'array', items: { type: 'object',
      properties: { nama: { type: 'string' }, provinsi: { type: 'string' } },
      required: ['nama','provinsi'] } } },
    required: ['kota'],
  },
}).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error('GAGAL:', e.message));
"
```

Expected: objek dengan array `kota` berisi 2 entri, masing-masing punya `nama` dan `provinsi`. Kalau muncul `GEMINI_API_KEY belum diisi`, isi dulu `.env`.

- [ ] **Step 5: Commit**

```bash
git add services/gemini.service.js
git commit -m "feat: tambah generateJson() untuk keluaran AI terstruktur"
```

---

### Task 6: `trip.service` — orkestrasi generate & versioning

**Files:**
- Create: `services/trip.service.js`

**Interfaces:**
- Consumes: model dari Task 2, `validateItinerary`/`RESPONSE_SCHEMA` dari Task 3, `geocode`/`haversineKm`/`estimateTravelMinutes`/`buildSearchQuery` dari Task 4, `generateJson` dari Task 5.
- Produces:
  - `createAndGenerate({ userId, input })` → `Promise<{ success, trip?, message? }>`
  - `listTrips(userId)` → `Promise<Trip[]>` (tanpa itinerary, untuk daftar)
  - `getTrip(userId, tripId)` → `Promise<object | null>` — trip + preference + itinerary versi terbaru lengkap dengan days & activities
  - `updateTrip(userId, tripId, patch)` → `Promise<{ success, trip?, message? }>`
  - `regenerate(userId, tripId)` → `Promise<{ success, trip?, message? }>`
  - `deleteTrip(userId, tripId)` → `Promise<boolean>`
  - `listVersions(userId, tripId)` → `Promise<Array<{id, version, totalEstimatedCost, generatedAt}>>`

**Aturan yang tidak boleh dilanggar di seluruh file ini:** setiap query yang menyentuh `Trip` wajib menyertakan `userId` di klausa `where`. Bukan dicek setelah data diambil — disaring di query. Fungsi yang tidak menemukan trip mengembalikan `null`/`{success:false}` yang oleh controller diterjemahkan jadi **404**, bukan 403.

- [ ] **Step 1: Bangun prompt generator**

Fungsi privat `bangunPrompt(trip, preference)` menghasilkan string. Isi yang wajib masuk: destinasi, kota asal (kalau ada), tanggal mulai & selesai, durasi hari, jumlah wisatawan, budget total, minat, pace, kebutuhan khusus.

Aturan yang ditulis di prompt (masing-masing punya alasan):

```js
const ATURAN = `
Aturan wajib:
- Buat TEPAT ${trip.durationDays} hari, tidak lebih dan tidak kurang.
- Jumlah aktivitas per hari mengikuti gaya perjalanan: santai 2-3, sedang 4, padat 5-6.
- Sebutkan nama tempat yang BENAR-BENAR ADA dan bisa dicari di peta.
  Jangan mengarang nama tempat. Kalau ragu, pilih tempat populer yang pasti ada.
- Isi coordinates dengan lintang & bujur tempat itu sebaik yang kamu tahu.
- estimatedCost dalam Rupiah, angka bulat, untuk ${trip.travelerCount} orang.
  Total seluruh aktivitas sebaiknya tidak melebihi Rp ${trip.budget}.
- Urutkan aktivitas dalam sehari secara masuk akal secara geografis -
  jangan bolak-balik menyeberang kota.
- startTime format 24 jam "HH:MM".
- category dipilih dari: wisata, kuliner, transport, penginapan, lainnya.
`.trim();
```

Kalimat "Jangan mengarang nama tempat" tidak dianggap cukup — dia cuma mengurangi peluang. Yang benar-benar menangkap tempat palsu adalah verifikasi Nominatim di Step 3.

Konstanta `SYSTEM_INSTRUCTION` untuk planner:

```js
const SYSTEM_INSTRUCTION = `
Kamu perencana perjalanan di aplikasi TrAvelIt.
Tugasmu menyusun itinerary harian yang realistis untuk wisatawan Indonesia.
Kamu selalu menjawab dalam Bahasa Indonesia.
Kamu mengutamakan jadwal yang masuk akal secara waktu dan jarak,
bukan jadwal yang terlihat padat di atas kertas.
`.trim();
```

- [ ] **Step 2: Verifikasi tempat**

Fungsi privat `async verifikasiTempat(activities, destinasi)`. Untuk tiap aktivitas:

1. Kategori `transport` **dilewati** — "perjalanan ke bandara" bukan tempat yang bisa dicari, dan memaksakannya cuma membuang jatah request Nominatim.
2. Selain itu: `geocode(buildSearchQuery(act.name, destinasi))`.
3. Ketemu → pakai `lat`/`lng` dari Nominatim, `placeVerified = true`.
4. Tidak ketemu tapi AI memberi koordinat sah → pakai koordinat AI, `placeVerified = false`.
5. Dua-duanya gagal → `lat`/`lng` tetap `null`, `placeVerified = false`.

Setelah itu hitung jarak antar aktivitas berurutan **dalam satu hari** (bukan lintas hari — hari baru mulai dari penginapan, jaraknya tidak bermakna):

```js
for (let i = 1; i < list.length; i++) {
  const prev = list[i - 1];
  const cur = list[i];
  if (prev.lat != null && cur.lat != null) {
    cur.distanceKmFromPrev = haversineKm(prev, cur);
    cur.travelMinutesFromPrev = estimateTravelMinutes(cur.distanceKmFromPrev);
  }
}
```

- [ ] **Step 3: Simpan dalam satu transaksi**

Fungsi prival `async simpanVersi(trip, hasilValid, { transaction })`:

1. Cari `version` tertinggi milik trip: `Itinerary.max('version', { where: { tripId }, transaction })`, lalu `+ 1` (atau `1` kalau `null`).
2. `Itinerary.create({ tripId, version, totalEstimatedCost, currency, modelUsed: config.geminiModel, generatedAt: new Date() })`.
3. Loop hari → `ItineraryDay.create(...)` dengan `date` dihitung dari `trip.startDate + (dayNumber - 1)` hari.
4. Loop aktivitas → `Activity.bulkCreate(...)`.
5. `trip.update({ status: 'generated', lastError: null })`.

Semuanya dibungkus `sequelize.transaction()`. Alasannya konkret: kalau penyimpanan gagal di tengah, yang tersisa bukan itinerary setengah jadi — mending tidak ada sama sekali daripada user melihat "Hari 3" yang aktivitasnya hilang.

**Penting soal urutan:** panggilan Gemini dan Nominatim dilakukan **di luar** transaksi. Keduanya bisa makan puluhan detik, dan menahan transaksi SQLite selama itu akan mengunci database untuk semua request lain.

- [ ] **Step 4: `createAndGenerate()`**

Alurnya: hitung `durationDays` dari tanggal → `Trip.create({ status: 'draft' })` → `Preference.create()` → panggil Gemini → validasi → verifikasi tempat → simpan versi.

Kalau validasi gagal setelah retry, trip **tetap disimpan** dengan `status: 'failed'` dan `lastError` diisi pesan yang bisa dibaca manusia. Trip tidak dihapus, supaya user bisa menekan "Coba lagi" tanpa mengisi ulang formulir.

Retry: kalau `validateItinerary` gagal, coba **sekali lagi** dengan prompt yang ditambahi daftar kesalahan sebelumnya:

```js
const promptPerbaikan = `${promptAwal}\n\nPercobaan sebelumnya ditolak karena:\n- ${errors.join('\n- ')}\nPerbaiki dan balas ulang.`;
```

Maksimal 2 percobaan total. Lebih dari itu cuma membakar kuota API untuk model yang jelas sedang tidak bisa mematuhi kontrak.

- [ ] **Step 5: `getTrip()` dengan eager loading**

```js
async function getTrip(userId, tripId) {
  const trip = await Trip.findOne({
    where: { id: tripId, userId },              // userId WAJIB ada di sini
    include: [{ model: Preference, as: 'preference' }],
  });
  if (!trip) return null;

  const itinerary = await Itinerary.findOne({
    where: { tripId: trip.id },
    include: [{
      model: ItineraryDay,
      as: 'days',
      include: [{ model: Activity, as: 'activities' }],
    }],
    // Satu klausa `order` saja - Sequelize gak nerima dua kunci `order`
    // dalam satu objek (yang kedua bakal nimpa yang pertama diam-diam).
    // Baris 1: pilih versi TERBARU. Baris 2 & 3: urutkan hari dan
    // aktivitas di dalamnya, karena tanpa ini urutannya ngikut urutan
    // baris di database - kebetulan bener sekarang, belum tentu nanti.
    order: [
      ['version', 'DESC'],
      [{ model: ItineraryDay, as: 'days' }, 'dayNumber', 'ASC'],
      [{ model: ItineraryDay, as: 'days' }, { model: Activity, as: 'activities' }, 'orderNo', 'ASC'],
    ],
  });

  return { trip, itinerary };
}
```

`findOne` + `order` versi DESC mengembalikan versi tertinggi. Kalau trip ada tapi belum punya itinerary (status `draft`/`failed`), `itinerary` bernilai `null` — halaman detail harus siap menampilkan kondisi itu, bukan menganggapnya error.

- [ ] **Step 6: `regenerate()` dan `updateTrip()`**

`regenerate(userId, tripId)`: ambil trip (dengan filter `userId`), pakai preferensi yang tersimpan, panggil alur generate yang sama, simpan sebagai versi berikutnya. **Tidak** menghapus versi lama — itu inti aturan versioning.

`updateTrip(userId, tripId, patch)`: hanya mengizinkan field `title`, `startDate`, `endDate`, `budget`, `travelerCount`, `originCity`, dan preferensi (`interests`, `pace`, `specialNeeds`). Field lain diabaikan diam-diam. Kalau tanggal berubah, `durationDays` dihitung ulang. Perubahan **tidak** otomatis memicu regenerate — user yang memutuskan, lewat tombol terpisah.

- [ ] **Step 7: Uji end-to-end lewat script**

```bash
node -e "
const { sequelize, User } = require('./models');
const trip = require('./services/trip.service');
(async () => {
  await sequelize.sync();
  const u = await User.findOne({ where: { role: 'admin' } });
  const hasil = await trip.createAndGenerate({ userId: u.id, input: {
    title: 'Tes Bali', destination: 'Bali', originCity: 'Surabaya',
    startDate: '2026-10-01', endDate: '2026-10-03', budget: 3000000,
    travelerCount: 2, interests: ['pantai','kuliner'], pace: 'sedang',
  }});
  console.log('sukses:', hasil.success, hasil.message || '');
  if (hasil.success) {
    const detail = await trip.getTrip(u.id, hasil.trip.id);
    console.log('versi   :', detail.itinerary.version);
    console.log('hari    :', detail.itinerary.days.length);
    console.log('aktivitas hari 1:', detail.itinerary.days[0].activities.map(a => a.name + (a.placeVerified ? ' [OK]' : ' [?]')));
    const ulang = await trip.regenerate(u.id, hasil.trip.id);
    const detail2 = await trip.getTrip(u.id, hasil.trip.id);
    console.log('setelah regenerate, versi:', detail2.itinerary.version, '(harus 2)');
    console.log('trip milik user lain:', await trip.getTrip(999999, hasil.trip.id), '(harus null)');
  }
  process.exit(0);
})();
"
```

Expected: `sukses: true`, jumlah hari `3`, sebagian aktivitas bertanda `[OK]`, versi setelah regenerate `2`, dan trip untuk `userId` asing `null`.

- [ ] **Step 8: Commit**

```bash
git add services/trip.service.js
git commit -m "feat: tambah trip.service (generate, verifikasi tempat, versioning)"
```

---

### Task 7: Endpoint trip, geo, dan statistik admin

**Files:**
- Create: `controllers/trip.controller.js`, `routes/trip.routes.js`
- Create: `controllers/geo.controller.js`, `routes/geo.routes.js`
- Create: `controllers/admin.controller.js`, `routes/admin.routes.js`
- Modify: `app.js`

**Interfaces:**
- Consumes: `trip.service` (Task 6), `geo.service` (Task 4), `requireAuth`/`requireAdmin` yang sudah ada, `sendResponse`.
- Produces: endpoint HTTP sesuai tabel di bawah.

| Method | Path | Middleware | Fungsi |
| --- | --- | --- | --- |
| POST | `/api/trips/generate` | `requireAuth` | buat trip + itinerary versi 1 |
| GET | `/api/trips` | `requireAuth` | daftar trip milik user |
| GET | `/api/trips/:id` | `requireAuth` | detail + itinerary terbaru |
| GET | `/api/trips/:id/versions` | `requireAuth` | daftar versi |
| PATCH | `/api/trips/:id` | `requireAuth` | ubah data trip |
| POST | `/api/trips/:id/regenerate` | `requireAuth` | versi baru |
| DELETE | `/api/trips/:id` | `requireAuth` | hapus trip |
| GET | `/api/geo/reverse?lat=&lng=` | `requireAuth` | koordinat → nama kota |
| GET | `/api/admin/stats` | `requireAdmin` | hitungan agregat |

- [ ] **Step 1: Validasi input di `controllers/trip.controller.js`**

Controller tetap tipis (ikut pola `auth.controller.js`), tapi validasi input **harus** ada di sini — bukan di service. Aturannya:

| Field | Aturan | Pesan gagal |
| --- | --- | --- |
| `destination` | wajib, ≤ 100 karakter | "Tujuan wajib diisi" |
| `startDate`, `endDate` | wajib, format `YYYY-MM-DD` sah | "Tanggal tidak valid" |
| `endDate >= startDate` | wajib | "Tanggal selesai tidak boleh sebelum tanggal mulai" |
| durasi | 1–14 hari | "Durasi perjalanan maksimal 14 hari" |
| `budget` | angka > 0 | "Budget harus lebih dari 0" |
| `travelerCount` | 1–20 | "Jumlah wisatawan antara 1 sampai 20" |
| `interests` | array, maksimal 8 item | "Minat maksimal 8" |
| `pace` | ada di `Preference.PACE` | "Gaya perjalanan tidak dikenal" |

Batas 14 hari itu keputusan sadar: itinerary 30 hari membuat satu respons Gemini jadi sangat panjang, gampang terpotong, dan verifikasi Nominatim-nya makan lebih dari 2 menit karena antrian 1 req/detik. Batas ini ditulis di README supaya bukan kejutan.

- [ ] **Step 2: Terjemahkan "tidak ketemu" jadi 404**

Pola yang dipakai di semua handler `:id`:

```js
const detail = await tripService.getTrip(req.session.userId, req.params.id);
if (!detail) {
  return sendResponse(res, { code: 404, success: false, message: 'Trip tidak ditemukan' });
}
```

Karena `getTrip` sudah menyaring dengan `userId`, trip milik orang lain otomatis jatuh ke cabang ini. Pesannya sengaja sama persis dengan trip yang memang tidak ada — **jangan** dibedakan jadi 403, karena itu memberi tahu penyerang bahwa ID tersebut ada dan milik orang lain.

- [ ] **Step 3: `controllers/geo.controller.js`**

```js
async function reverse(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return sendResponse(res, { code: 400, success: false, message: 'Koordinat tidak valid' });
  }

  const hasil = await geo.reverseGeocode(lat, lng);
  if (!hasil) {
    return sendResponse(res, { code: 404, success: false, message: 'Lokasi tidak dikenali' });
  }

  return sendResponse(res, { data: hasil });
}
```

Endpoint ini ada supaya browser **tidak** memanggil Nominatim langsung. Kalau tiap browser memanggil sendiri, aturan 1 req/detik dan `User-Agent` tidak bisa ditegakkan, dan IP pengguna yang kena getahnya. `requireAuth` dipasang supaya endpoint ini tidak jadi proxy geocoding gratis untuk orang luar.

- [ ] **Step 4: `controllers/admin.controller.js`**

```js
async function stats(req, res) {
  const [totalUser, totalTrip, totalDestinasi, totalArtikel] = await Promise.all([
    User.count({ where: { role: 'user' } }),
    Trip.count(),
    Destination.count(),
    Article.count(),
  ]);

  return sendResponse(res, {
    data: { totalUser, totalTrip, totalDestinasi, totalArtikel },
  });
}
```

Hanya `COUNT`. Admin **tidak** boleh melihat tujuan atau isi itinerary siapa pun — itu batas yang sudah ditetapkan di spec bagian 11.

- [ ] **Step 5: Mount di `app.js`**

Tambahkan setelah `app.use(express.json())`, sebelum `app.use('/', pageRoutes)`:

```js
app.use('/api/trips', tripRoutes);   // M5
app.use('/api/geo', geoRoutes);      // M5
app.use('/api/admin', adminRoutes);
```

**Jangan** memindahkan `app.use('/api/chat', chatRoutes)` dari posisinya sekarang (sebelum `express.json()` global) — komentar panjang di `app.js` menjelaskan kenapa, dan alasannya masih berlaku untuk fitur foto.

- [ ] **Step 6: Uji dengan curl**

Jalankan `npm run dev` di terminal lain, lalu:

```bash
# login dulu, simpan cookie
curl -s -c cookie.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@travelit.com","password":"admin123"}'

# generate
curl -s -b cookie.txt -X POST http://localhost:3000/api/trips/generate \
  -H "Content-Type: application/json" \
  -d '{"title":"Tes Jogja","destination":"Yogyakarta","startDate":"2026-10-01","endDate":"2026-10-02","budget":1500000,"travelerCount":2,"interests":["budaya"],"pace":"santai"}'

# daftar & detail
curl -s -b cookie.txt http://localhost:3000/api/trips
curl -s -b cookie.txt http://localhost:3000/api/trips/1

# trip yang tidak ada -> harus 404
curl -s -o /dev/null -w "%{http_code}\n" -b cookie.txt http://localhost:3000/api/trips/99999

# tanpa login -> harus 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/trips

# validasi: durasi 40 hari -> harus 400
curl -s -b cookie.txt -X POST http://localhost:3000/api/trips/generate \
  -H "Content-Type: application/json" \
  -d '{"title":"X","destination":"Bali","startDate":"2026-10-01","endDate":"2026-11-10","budget":100,"travelerCount":1,"pace":"santai"}'

rm cookie.txt
```

Expected: generate `"success": true`; detail berisi `days`; ID tak dikenal `404`; tanpa login `401`; durasi 40 hari pesan "maksimal 14 hari".

- [ ] **Step 7: Commit**

```bash
git add controllers/trip.controller.js controllers/geo.controller.js controllers/admin.controller.js routes/ app.js
git commit -m "feat: tambah endpoint trip, reverse geocode, dan statistik admin"
```

---

### Task 8: Rute halaman & rename view

**Files:**
- Rename: `views/user/products.html` → `views/user/destinations.html`
- Rename: `views/admin/products.html` → `views/admin/destinations.html`
- Rename: `views/admin/news.html` → `views/admin/articles.html`
- Modify: `controllers/page.controller.js`, `routes/page.routes.js`, `routes/admin.page.routes.js`
- Modify: `public/partials/navbar-user.html`, `public/partials/navbar-admin.html`, `public/partials/sidebar-admin.html`
- Modify: semua `<title>` di `views/**/*.html`

**Interfaces:**
- Produces: rute `/`, `/destinasi`, `/planner`, `/trip/:id`, `/chat`, `/login`, `/register`, `/admin`, `/admin/artikel`, `/admin/destinasi`.

- [ ] **Step 1: Rename file dengan `git mv`**

Pakai `git mv`, bukan `mv` — supaya git mencatatnya sebagai rename dan riwayat file tidak putus.

```bash
cd "D:/KULIAH/ANTARA2025/PDW/Final-Project-PDW"
git mv views/user/products.html views/user/destinations.html
git mv views/admin/products.html views/admin/destinations.html
git mv views/admin/news.html views/admin/articles.html
```

- [ ] **Step 2: Perbarui `controllers/page.controller.js`**

```js
module.exports = {
  // auth
  loginPage: serve('auth/login.html'),
  registerPage: serve('auth/register.html'),

  // user (publik)
  landingPage: serve('user/landing.html'),            // M1
  destinationsPage: serve('user/destinations.html'),  // M3
  plannerPage: serve('user/planner.html'),            // M5
  tripDetailPage: serve('user/trip.html'),            // M5
  chatPage: serve('user/chat.html'),                  // M5

  // admin (proteksi requireAdminPage dipasang di routes)
  adminDashboard: serve('admin/dashboard.html'),
  adminArticlesPage: serve('admin/articles.html'),        // M2
  adminDestinationsPage: serve('admin/destinations.html'),// M4
};
```

- [ ] **Step 3: Perbarui `routes/page.routes.js`**

```js
router.get('/', page.landingPage);                 // M1
router.get('/login', page.loginPage);
router.get('/register', page.registerPage);
router.get('/destinasi', page.destinationsPage);   // M3
router.get('/planner', page.plannerPage);          // M5
router.get('/trip/:id', page.tripDetailPage);      // M5
router.get('/chat', page.chatPage);                // M5
```

`/trip/:id` menyajikan file HTML yang sama untuk ID mana pun; ID-nya dibaca di browser dari `location.pathname` lalu dipakai memanggil API. Otorisasinya tetap di API (Task 7), bukan di rute halaman — halaman kosong tanpa data tidak membocorkan apa-apa.

- [ ] **Step 4: Perbarui `routes/admin.page.routes.js`**

```js
router.get('/', requireAdminPage, page.adminDashboard);
router.get('/artikel', requireAdminPage, page.adminArticlesPage);      // M2
router.get('/destinasi', requireAdminPage, page.adminDestinationsPage);// M4
```

- [ ] **Step 5: Perbarui partial navbar & sidebar**

`navbar-user.html` — ganti brand dan menu:

```html
<a class="navbar-brand" href="/">🧭 <span data-app-name>TrAvelIt</span></a>
...
<li class="nav-item"><a class="nav-link" href="/">Beranda</a></li>
<li class="nav-item"><a class="nav-link" href="/destinasi">Destinasi</a></li>
<li class="nav-item"><a class="nav-link" href="/planner">Rencana Perjalanan</a></li>
<li class="nav-item"><a class="nav-link" href="/chat">Asisten AI</a></li>
```

`navbar-admin.html` — `🧭 <span data-app-name>TrAvelIt</span> - Admin`.

`sidebar-admin.html` — menu jadi Dashboard, Kelola Artikel (M2), Kelola Destinasi (M4), lalu pemisah, lalu Rencana Perjalanan + Asisten AI. Pertahankan komentar yang menjelaskan kenapa halaman user muncul di sidebar admin, tapi sesuaikan istilahnya ke tema baru.

Atribut `data-store-name` diganti `data-app-name` di ketiga file. (Atribut ini saat ini belum dibaca JS mana pun — biarkan begitu, jangan tambah kode yang tidak dipakai.)

- [ ] **Step 6: Ganti `<title>` dan placeholder tiap halaman**

| File | `<title>` | Isi placeholder |
| --- | --- | --- |
| `views/user/landing.html` | `TrAvelIt` | `<h1>Landing Page (Mahasiswa 1)</h1>` + TODO: hero, artikel dari `GET /api/articles`, widget cuaca kota tujuan, AI rekomendasi waktu berkunjung |
| `views/user/destinations.html` | `Destinasi - TrAvelIt` | TODO M3: browse + filter dari `GET /api/destinations`, AI destination finder (quiz) |
| `views/admin/articles.html` | `Kelola Artikel - TrAvelIt` | TODO M2: CRUD artikel + AI caption |
| `views/admin/destinations.html` | `Kelola Destinasi - TrAvelIt` | TODO M4: CRUD destinasi + AI deskripsi |
| `views/admin/dashboard.html` | `Dashboard Admin - TrAvelIt` | kartu statistik dari `GET /api/admin/stats` |
| `views/auth/login.html` | `Login - TrAvelIt` | — |
| `views/auth/register.html` | `Daftar - TrAvelIt` | — |

Dashboard admin diisi empat kartu (`totalUser`, `totalTrip`, `totalDestinasi`, `totalArtikel`) yang datanya diambil lewat `fetch('/api/admin/stats')` — cukup ditulis inline di `<script>` halaman itu, tidak perlu file JS terpisah untuk empat angka.

- [ ] **Step 7: Verifikasi di browser**

Jalankan `npm run dev`, lalu buka dan pastikan tidak ada 404 maupun error konsol:
`/`, `/destinasi`, `/chat`, `/login`, `/register`, dan (setelah login admin) `/admin`, `/admin/artikel`, `/admin/destinasi`.

`/planner` dan `/trip/1` masih 404 sampai Task 9–10 — itu diharapkan.

- [ ] **Step 8: Commit**

```bash
git add views/ public/partials/ controllers/page.controller.js routes/page.routes.js routes/admin.page.routes.js
git commit -m "refactor: rename view products/news jadi destinations/articles + rute baru"
```

---

### Task 9: Halaman planner + geolocation

**Files:**
- Create: `views/user/planner.html`
- Create: `public/js/planner.js`
- Create: `public/js/geo-client.js`

**Interfaces:**
- Consumes: `POST /api/trips/generate`, `GET /api/trips`, `DELETE /api/trips/:id`, `GET /api/geo/reverse` (Task 7).
- Produces: `window.GeoClient = { minta(), reverse(lat, lng), tersedia() }` — dipakai ulang di Task 10.

- [ ] **Step 1: `public/js/geo-client.js` — pembungkus geolocation**

Dipisah dari `planner.js` karena Task 10 juga memakainya, dan karena penanganan izin geolocation punya banyak cabang yang tidak enak dicampur dengan logika form.

```js
/**
 * Pembungkus navigator.geolocation.
 *
 * Geolocation itu FITUR TAMBAHAN, bukan syarat. User berhak menolak
 * izin lokasi, browsernya bisa gak dukung, atau dia lagi buka lewat
 * http:// (Chrome cuma ngizinin geolocation di https atau localhost).
 * Semua kemungkinan itu HARUS berujung ke pesan yang jelas, bukan
 * halaman yang diem aja atau error di konsol.
 */
const GeoClient = {
  tersedia() {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  },

  minta() {
    return new Promise((resolve, reject) => {
      if (!this.tersedia()) {
        return reject(new Error('Browser ini tidak mendukung deteksi lokasi'));
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          const pesan = {
            1: 'Izin lokasi ditolak. Kamu masih bisa mengetik kota asal manual.',
            2: 'Lokasi tidak bisa ditentukan. Coba lagi atau ketik manual.',
            3: 'Deteksi lokasi kelamaan. Coba lagi atau ketik manual.',
          };
          reject(new Error(pesan[err.code] || 'Gagal mendeteksi lokasi'));
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  },

  async reverse(lat, lng) {
    const res = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  },
};

window.GeoClient = GeoClient;
```

`enableHighAccuracy: false` disengaja — untuk menebak nama kota, GPS presisi tinggi cuma memboroskan baterai dan memperlambat respons. `maximumAge: 300000` mengizinkan posisi cache 5 menit.

- [ ] **Step 2: `views/user/planner.html` — form + daftar trip**

Struktur: navbar user → dua kolom (form di kiri `col-lg-5`, daftar trip di kanan `col-lg-7`).

Isi form:

| Field | Elemen | Catatan |
| --- | --- | --- |
| Judul | `input#judul` | opsional, default "Perjalanan ke {destinasi}" |
| Tujuan | `input#destinasi` | wajib |
| Kota asal | `input#asal` + `button#btn-lokasi` | tombol "📍 Pakai lokasi saya" |
| Tanggal mulai / selesai | `input[type=date]` | `min` = hari ini |
| Budget | `input[type=number]#budget` | rupiah |
| Jumlah wisatawan | `input[type=number]#jumlah` | 1–20 |
| Minat | checkbox chips | pantai, gunung, budaya, kuliner, belanja, alam, sejarah, santai |
| Gaya perjalanan | `select#pace` | santai / sedang / padat |
| Kebutuhan khusus | `textarea#kebutuhan` | opsional |

Sama seperti `chat.html`, halaman ini publik tapi API-nya butuh login — jadi sediakan `div#need-login` yang ditampilkan saat `GET /api/trips` membalas 401, dan `div#planner-area.d-none` untuk isi sebenarnya.

Sertakan `div#loading-overlay` berisi spinner dengan teks jujur: generate memanggil Gemini lalu memverifikasi tiap tempat ke Nominatim satu per detik, jadi **wajar makan 20–60 detik**. Diamnya layar tanpa penjelasan bikin user mengira aplikasinya hang.

- [ ] **Step 3: `public/js/planner.js`**

Fungsi yang dibutuhkan:

- `init()` — pasang listener, panggil `muatDaftarTrip()`
- `muatDaftarTrip()` — `GET /api/trips`; 401 → tampilkan `#need-login`; kosong → empty state "Belum ada rencana perjalanan"
- `handlePakaiLokasi()` — `GeoClient.minta()` → `GeoClient.reverse()` → isi `#asal`. Kegagalan ditampilkan sebagai teks kecil di bawah field, **bukan** `alert()`, dan field tetap bisa diketik manual
- `handleSubmit()` — kumpulkan form, kunci tombol, tampilkan overlay, `POST /api/trips/generate`, lalu `window.location.href = '/trip/' + id`
- `handleHapus(id)` — `confirm()` dulu, lalu `DELETE`
- `formatRupiah(angka)` — `new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0})`

Kartu trip menampilkan judul, destinasi, rentang tanggal, durasi, dan lencana status: `generated` → hijau "Siap", `draft` → abu "Draf", `failed` → merah "Gagal" beserta `lastError` dan tombol "Coba lagi" yang memanggil regenerate.

- [ ] **Step 4: Verifikasi di browser**

1. Buka `/planner` tanpa login → muncul ajakan login, bukan form.
2. Login, buka `/planner` → form tampil.
3. Klik "Pakai lokasi saya" → izinkan → field kota asal terisi. **Lalu tolak izinnya** (reset izin di setelan situs) → muncul pesan ramah, form tetap bisa dipakai.
4. Isi form 2 hari, submit → overlay muncul, lalu pindah ke `/trip/:id`.
5. Kembali ke `/planner` → trip tadi ada di daftar dengan lencana "Siap".

- [ ] **Step 5: Commit**

```bash
git add views/user/planner.html public/js/planner.js public/js/geo-client.js
git commit -m "feat: halaman planner + geolocation untuk isi kota asal"
```

---

### Task 10: Halaman detail trip + peta Leaflet

**Files:**
- Create: `views/user/trip.html`
- Create: `public/js/trip-map.js`

**Interfaces:**
- Consumes: `GET /api/trips/:id`, `POST /api/trips/:id/regenerate`, `GeoClient` (Task 9).

- [ ] **Step 1: Muat Leaflet lewat CDN**

Di `<head>` `views/user/trip.html`, **CSS sebelum JS** dan JS sebelum `trip-map.js`:

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
```

Versi di-pin dan `integrity` disertakan — kalau CDN diubah, halaman gagal muat dengan jelas alih-alih diam-diam menjalankan kode lain.

- [ ] **Step 2: Tata letak halaman**

Dua kolom: kiri `col-lg-5` daftar aktivitas per hari (accordion Bootstrap), kanan `col-lg-7` peta `div#map` yang `position: sticky; top: 1rem; height: 70vh`.

Header berisi judul trip, destinasi, rentang tanggal, total estimasi biaya, lencana "Versi N", dan tombol "Buat Ulang". Baris tombol hari (`#day-tabs`) di atas peta untuk memfilter titik per hari.

Di bawah peta, tulis keterangan jujur:

> Garis pada peta menghubungkan urutan aktivitas, bukan rute jalan sebenarnya. Jarak dan waktu tempuh adalah perkiraan garis lurus.

Ini bukan basa-basi — tanpa itu, polyline lurus di atas peta terbaca sebagai klaim rute yang tidak pernah kita hitung.

- [ ] **Step 3: `public/js/trip-map.js`**

```js
const tripId = window.location.pathname.split('/').pop();

let peta = null;
let lapisanAktif = null;   // LayerGroup isi marker + polyline hari terpilih
let markerUser = null;
```

Fungsi:

- `init()` — baca `tripId`, `GET /api/trips/:id`; 401 → ajakan login; 404 → "Trip tidak ditemukan atau bukan milikmu"
- `renderHari(days)` — accordion, tiap aktivitas menampilkan jam, nama, kategori, deskripsi, biaya, dan kalau ada: "±{km} km · sekitar {menit} menit dari sebelumnya". Aktivitas dengan `placeVerified === false` diberi lencana `⚠️ lokasi belum terverifikasi`; yang `lat === null` diberi `📍 tidak ada titik peta`
- `initPeta()` — `L.map('map')` + tile OSM dengan atribusi wajib:

```js
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(peta);
```

Atribusi itu syarat lisensi ODbL, bukan pilihan.

- `tampilkanHari(dayNumber)` — hapus `lapisanAktif` kalau ada, ambil aktivitas hari itu yang punya koordinat, buat marker bernomor (`L.divIcon` dengan CSS lingkaran + angka `orderNo`), buat `L.polyline` dari koordinat berurutan, lalu `peta.fitBounds(lapisan.getBounds(), { padding: [30, 30] })`
- `tandaiPosisiUser()` — `GeoClient.minta()` lalu `L.circleMarker` biru dengan popup "Kamu di sini". Dipanggil **tanpa await** dan kegagalannya diabaikan diam-diam: peta harus tampil lebih dulu, dan user yang menolak izin lokasi tidak perlu diberi tahu apa-apa di halaman ini
- `handleRegenerate()` — konfirmasi ("Versi lama tetap tersimpan"), `POST regenerate`, muat ulang halaman

**Kasus tepi yang wajib ditangani:** kalau satu hari **tidak punya satu pun** aktivitas berkoordinat, jangan panggil `fitBounds` — `getBounds()` pada layer kosong melempar error dan mematikan seluruh script. Tampilkan pesan "Belum ada titik peta untuk hari ini" di atas peta dan pertahankan tampilan peta sebelumnya.

- [ ] **Step 4: Verifikasi di browser**

1. Buka `/trip/:id` milik sendiri → itinerary + peta tampil, marker bernomor sesuai urutan.
2. Klik tombol hari lain → peta berganti titik.
3. Izinkan lokasi → marker biru "Kamu di sini" muncul; tolak → peta tetap normal, tidak ada error konsol.
4. Buka `/trip/:id` milik user lain (login akun berbeda) → pesan "Trip tidak ditemukan".
5. Klik "Buat Ulang" → lencana versi naik jadi 2.
6. Perkecil jendela ke lebar ponsel → peta dan daftar menumpuk rapi, tidak ada scroll horizontal.

- [ ] **Step 5: Commit**

```bash
git add views/user/trip.html public/js/trip-map.js
git commit -m "feat: halaman detail trip dengan peta Leaflet dan filter per hari"
```

---

### Task 11: Retheme fitur chat M5

**Files:**
- Modify: `services/chat.service.js`
- Modify: `views/user/chat.html`
- Modify: `public/js/chat.js`
- Modify: `models/chatMessage.model.js` (komentar saja)
- Modify: `controllers/chat.controller.js` (komentar saja)

**Interfaces:** tidak ada perubahan bentuk API. `GET/POST/DELETE /api/chat*` tetap sama persis — yang berubah hanya isi prompt dan salinan teks UI.

- [ ] **Step 1: Ganti `SYSTEM_INSTRUCTION` di `chat.service.js`**

```js
const SYSTEM_INSTRUCTION = `
Kamu adalah asisten perjalanan di aplikasi TrAvelIt.
Tugasmu bantu wisatawan Indonesia merencanakan dan menjalani perjalanan.

Aturan menjawab:
- Selalu jawab dalam Bahasa Indonesia yang santai tapi sopan.
- Jawab ringkas dan langsung ke inti (maksimal sekitar 4 paragraf pendek).
- Kalau menjelaskan langkah-langkah atau urutan kunjungan, pakai poin bernomor.
- Kalau menyebut biaya, sebutkan sebagai PERKIRAAN dan sertakan satuannya
  (misal "sekitar Rp 50.000 per orang"), jangan seolah harga pasti.
- Kalau pertanyaannya kurang jelas (belum jelas kota tujuan, berapa hari,
  budget berapa, pergi berapa orang), tanya balik dulu sebelum menyarankan.
- Kalau user minta dibuatkan itinerary lengkap, arahkan ke halaman
  "Rencana Perjalanan" (/planner) yang bisa menyusun jadwal harian
  sekaligus memetakannya.
- Kalau ditanya hal DI LUAR perjalanan dan pariwisata, tolak dengan halus
  dan arahkan balik ke topik perjalanan.
- Jangan mengarang nama tempat, harga tiket, atau jadwal transportasi.
  Kalau belum yakin, bilang belum yakin dan sarankan cek sumber resmi.
`.trim();
```

Baris "arahkan ke /planner" itu yang menyambungkan chat dengan fitur inti — tanpa itu, chat jadi pulau terpisah dan user tidak pernah menemukan planner-nya.

- [ ] **Step 2: Ganti `VISION_INSTRUCTION`**

Deteksi hama → identifikasi tempat:

```js
const VISION_INSTRUCTION = `
${SYSTEM_INSTRUCTION}

Sekarang kamu lagi menganalisa FOTO tempat yang dikirim user.
Jawab dengan struktur persis seperti ini:

**Perkiraan tempat:** (nama tempat/landmark, atau "tidak bisa dipastikan")
**Lokasi:** (kota & negara kalau bisa ditebak)
**Tingkat keyakinan:** (tinggi / sedang / rendah)
**Yang terlihat di foto:** (poin-poin ciri yang kamu pakai buat menebak)
**Kenapa menarik dikunjungi:** (2-3 poin singkat)
**Tips berkunjung:** (waktu terbaik, perkiraan biaya masuk, hal yang perlu disiapkan)

Kalau fotonya buram, kegelapan, atau bukan foto tempat/pemandangan,
jangan mengarang - bilang saja fotonya kurang jelas dan minta user
kirim foto lain yang memperlihatkan bangunan atau pemandangannya.

PENTING: jangan menebak nama tempat yang spesifik kalau keyakinanmu
rendah. Lebih baik bilang "ini terlihat seperti pantai tropis, tapi saya
tidak bisa memastikan yang mana" daripada menyebut nama yang keliru.
`.trim();
```

Peringatan terakhir itu penting karena salah menebak landmark dengan nada percaya diri justru lebih merugikan daripada mengaku tidak tahu — user bisa jadi merencanakan perjalanan ke tempat yang keliru.

- [ ] **Step 3: Perbarui teks di `chat.service.js` lainnya**

- Komentar header file: "chat konsultasi pertanian + deteksi hama/penyakit" → "chat asisten perjalanan + identifikasi tempat dari foto"
- Variabel `pertanyaan` di `detectDisease()`: "Tolong analisa foto tanaman ini..." → "Tolong analisa foto tempat ini, ini di mana dan menariknya apa?"
- Rename fungsi `detectDisease` → `identifyPlace`, dan perbarui pemanggilnya di `controllers/chat.controller.js` (fungsi `detect`). Nama rute `/api/chat/detect` **tetap** — mengubahnya akan memutus `public/js/chat.js` tanpa manfaat.
- Pesan error format foto tetap sama (soal JPG/PNG/WEBP, tidak ada kaitan tema).

- [ ] **Step 4: Perbarui `views/user/chat.html`**

| Bagian | Jadi |
| --- | --- |
| `<title>` | `Asisten AI - TrAvelIt` |
| `<h1>` | `🧭 Asisten Perjalanan` |
| Subjudul | "Tanya seputar destinasi, budget, dan transportasi — atau upload foto tempat buat dikenali." |
| Label foto | `📷 Kenali tempat dari foto` |
| Placeholder textarea | `Contoh: 3 hari di Yogyakarta budget 2 juta enaknya ke mana aja?` |
| Placeholder catatan foto | `Catatan (opsional): kira-kira di kota mana` |
| Tombol | `Analisa Foto` → `Kenali Tempat` |
| Disclaimer | "Jawaban dibuat AI (Gemini) dan bisa saja keliru — cek harga & jadwal ke sumber resmi sebelum berangkat." |
| `.bubble-user` | warna `#0d6efd` (biru, tema travel) menggantikan `#198754` (hijau tani) |
| Tombol kirim | `btn-success` → `btn-primary`; tombol foto `btn-outline-success` → `btn-outline-primary` |

Tambahkan juga tautan ke `/planner` di bawah subjudul: "Mau jadwal harian lengkap + peta? Coba Rencana Perjalanan."

- [ ] **Step 5: Perbarui `public/js/chat.js`**

- Komentar header: ganti deskripsi fitur ke tema perjalanan
- `MAX_DIMENSI_FOTO`, `KUALITAS_JPEG`, dan seluruh logika kompresi **tidak diubah** — itu murni teknis dan tidak ada kaitannya dengan tema
- `tampilkanSambutan()`:

```js
tambahBubble(
  'model',
  'Halo! 👋 Saya asisten perjalanan TrAvelIt.\n\n' +
    'Tanya apa saja soal liburan — mulai dari pilihan destinasi, ' +
    'perkiraan budget, sampai transportasi antar kota.\n\n' +
    'Punya foto tempat tapi lupa itu di mana? Upload di bawah, nanti ' +
    'saya bantu kenali. 🧭',
  { scroll: false }
);
```

- Label bubble foto: `'📷 Foto tanaman'` → `'📷 Foto tempat'`, `alt="Foto tanaman"` → `alt="Foto tempat"`
- Teks loading: `'Sedang menganalisa foto'` → `'Sedang mengenali tempat'`
- Pesan error: "Gagal menganalisa foto" → "Gagal mengenali tempat"

- [ ] **Step 6: Perbarui komentar `models/chatMessage.model.js`**

Blok komentar masih membahas "riwayat chat konsultasi pertanian" dan "hasil deteksi foto hama". Tulis ulang untuk tema perjalanan; struktur kolomnya sendiri tidak berubah sama sekali.

- [ ] **Step 7: Verifikasi di browser**

1. `/chat` → sambutan baru muncul, warna bubble biru.
2. Kirim "3 hari di Bali budget 2 juta" → jawaban relevan dan menyebut `/planner`.
3. Kirim "cara menanam cabai" → AI menolak halus dan mengarahkan balik ke topik perjalanan.
4. Upload foto landmark → keluar struktur "Perkiraan tempat / Lokasi / Tingkat keyakinan / ...".
5. Refresh halaman → riwayat tetap ada.
6. "Hapus Riwayat" → kembali ke sambutan.

- [ ] **Step 8: Commit**

```bash
git add services/chat.service.js controllers/chat.controller.js models/chatMessage.model.js views/user/chat.html public/js/chat.js
git commit -m "refactor: ubah chat M5 dari konsultasi pertanian jadi asisten perjalanan"
```

---

### Task 12: Dokumentasi & sapu bersih

**Files:**
- Rewrite: `PRD.md`, `README.md`
- Modify: `config/README.md`, `controllers/README.md`, `middlewares/README.md`, `models/README.md`, `public/js/README.md`, `public/partials/README.md`, `routes/README.md`, `seeders/README.md`, `services/README.md`, `utils/README.md`, `views/README.md`
- Create: `test/README.md`

- [ ] **Step 1: Tulis ulang `PRD.md`**

Mengikuti struktur PPT, urutan bagiannya:

1. **Latar belakang** — perencanaan wisata terfragmentasi: informasi tersebar, rencana tidak konsisten (waktu tempuh vs budget vs jam buka), beban keputusan tinggi. Tesis: satu formulir → itinerary harian + estimasi biaya + rute peta, tersimpan dan bisa dibuat ulang.
2. **Landasan** — key paper Kotari dkk. (2025), IJISRT 10(11), 1157–1162, DOI 10.38124/ijisrt/25nov927. Tiga temuan yang dipakai: input personal, output terstruktur, arsitektur modern. **Sertakan tabel adaptasi stack** (Next.js→HTML/Bootstrap, Convex→Express/Sequelize, PostgreSQL→SQLite, Google Maps→Leaflet+Nominatim) — ini menunjukkan adaptasinya sadar, bukan menyimpang diam-diam.
3. **Tech stack** — tabel seperti PRD lama, tambah baris Peta (Leaflet + OSM) dan Geocoding (Nominatim).
4. **Pembagian kerja** — 5 mahasiswa dengan tautan GitHub yang **dipertahankan apa adanya** dari PRD lama, hanya deskripsi fiturnya yang berganti tema (lihat tabel Step 2).
5. **Kebutuhan fungsional** — INPUT / PROSES / OUTPUT + user journey, disalin dari slide 4.
6. **Kebutuhan nonfungsional** — tabel 6 aspek slide 5 beserta cara masing-masing dipenuhi di repo ini.
7. **Struktur database** — seluruh tabel dari spec bagian 4.
8. **API** — tabel endpoint, termasuk penandaan mana yang sudah jadi dan mana jatah siapa.
9. **Alur integrasi AI & data** — kontrak JSON + aturan validasi + verifikasi Nominatim.
10. **Rancangan implementasi** — 4 increment slide 12 (Fondasi, Core trip, Integrasi, Hardening) + tabel risiko & mitigasi.
11. **Definition of Done per mahasiswa** — pertahankan 4 poin dari PRD lama, sesuaikan istilahnya.

- [ ] **Step 2: Peta pembagian kerja lama → baru**

| # | Lama (Tani Makmur) | Baru (TrAvelIt) | PJ |
| --- | --- | --- | --- |
| 1 | Landing + cuaca + AI waktu tanam | Landing page + widget cuaca kota tujuan + AI rekomendasi waktu berkunjung | M1 [4D1FK4](https://github.com/4D1FK4) |
| 2 | CRUD News + AI caption | CRUD Artikel wisata + AI rekomendasi caption | M2 [nabilaghnaaa](https://github.com/nabilaghnaaa) |
| 3 | Browse produk + AI product finder | Browse destinasi + AI destination finder (quiz) | M3 [variannn340](https://github.com/variannn340) |
| 4 | CRUD produk + AI deskripsi | CRUD destinasi + AI rekomendasi deskripsi | M4 [Dhandha Dendriya](https://github.com/DhandhaDendriyaE) |
| 5 | Chat pertanian + deteksi hama | **Trip planner (itinerary + peta + geolocation)** + asisten perjalanan + identifikasi tempat dari foto | M5 [PannnTastic](https://github.com/PannnTastic) |

Catat eksplisit di PRD bahwa `WEATHER_API_KEY` sekarang dipakai M1 untuk cuaca **kota tujuan**, bukan cuaca lahan.

- [ ] **Step 3: Tulis ulang `README.md`**

Bagian yang wajib ada:
- Judul + satu paragraf: apa itu TrAvelIt
- Tabel "yang sudah jadi" vs "yang masih placeholder" (M5 ditandai selesai, M1–M4 belum)
- Struktur folder yang **cocok dengan kenyataan** setelah semua task (termasuk `test/` dan `docs/`)
- Cara install: `cp .env.example .env`, isi `GEMINI_API_KEY`, `npm install`, `npm run seed`, `npm run dev`
- **Login admin default: `admin@travelit.com` / `admin123`**
- Bagian "Kalau habis git pull error tabel" → jelaskan `npm run db:reset` dan **peringatkan bahwa itu menghapus seluruh data lokal**
- Cara kerja `data-include` partial (pertahankan penjelasan yang sudah ada, ganti contohnya ke tema baru)
- Cara nambah endpoint baru (pertahankan)
- **Dokumentasi fitur M5** — tabel endpoint trip + chat, catatan teknis: kontrak JSON, verifikasi Nominatim, aturan versioning, batas 14 hari, kenapa generate makan 20–60 detik
- Cara pakai Gemini untuk M1–M4 — pertahankan contoh `generate()`/`chat()` yang sudah ada, **tambah** contoh `generateJson()`
- Cara pakai Leaflet & geolocation untuk M3 kalau butuh peta di halaman browse
- Pertahankan catatan versi `@google/genai ^0.6.1` yang menjelaskan kenapa 0.5.0 rusak — informasi itu masih berlaku dan menyelamatkan orang dari `MODULE_NOT_FOUND`
- Cara jalanin test: `npm test`

- [ ] **Step 4: Perbarui 11 README folder + buat `test/README.md`**

| File | Perubahan |
| --- | --- |
| `config/README.md` | tambah keterangan `nominatimBaseUrl` & `nominatimUserAgent` |
| `controllers/README.md` | tambah `trip`, `geo`, `admin`; ubah deskripsi `chat` |
| `middlewares/README.md` | tidak berubah isinya; pastikan tidak ada istilah lama |
| `models/README.md` | daftar 9 model baru + catatan `products`/`news` sudah jadi `destinations`/`articles` |
| `public/js/README.md` | tambah `planner.js`, `trip-map.js`, `geo-client.js` |
| `public/partials/README.md` | ganti contoh & nama halaman |
| `routes/README.md` | tambah `trip.routes`, `geo.routes`, `admin.routes`; pertahankan penjelasan urutan mount `chat.routes` |
| `seeders/README.md` | admin baru + data destinasi & artikel dummy + `npm run db:reset` |
| `services/README.md` | tambah `geo.service`, `trip.service`, `itinerarySchema`; perbarui deskripsi `gemini.service` dengan `generateJson()` |
| `utils/README.md` | tidak berubah |
| `views/README.md` | daftar halaman baru (`planner.html`, `trip.html`, `destinations.html`, `articles.html`) |
| `test/README.md` | **baru** — jelaskan `npm test` pakai `node:test` bawaan (tanpa dependency), dan **kenapa** hanya `itinerarySchema` + fungsi murni `geo` yang diuji: sisanya butuh jaringan/database dan lebih jujur diuji manual |

- [ ] **Step 5: Sapu bersih — grep istilah lama**

```bash
cd "D:/KULIAH/ANTARA2025/PDW/Final-Project-PDW"
grep -rniE "tani ?makmur|tanimakmur|pertanian|petani|\bhama\b|pupuk|bibit|penyuluh|\bpanen\b|bahan pertanian|waktu tanam" \
  --include="*.js" --include="*.html" --include="*.md" --include="*.json" --include="*.example" \
  . | grep -v node_modules | grep -v "docs/superpowers"
```

Expected: **tidak ada hasil.** Folder `docs/superpowers/` dikecualikan karena spec & plan memang membahas tema lama sebagai konteks perubahan — itu catatan sejarah, bukan sisa yang terlewat.

Lalu cek konsistensi kapitalisasi nama:

```bash
grep -rn "Travelit\|TravelIt\|TRAVELIT\|travelIt" \
  --include="*.js" --include="*.html" --include="*.md" . | grep -v node_modules
```

Expected: tidak ada hasil (kecuali `travelit-dev-secret-local` di `.env` dan `admin@travelit.com`, yang memang huruf kecil semua).

- [ ] **Step 6: Verifikasi akhir menyeluruh**

```bash
npm test                 # semua test lulus
npm run db:reset         # database bersih + seed
npm run dev              # server jalan tanpa error
```

Lalu telusuri di browser dan pastikan tiap poin Definition of Done spec bagian 15 terpenuhi:

- [ ] `/` `/destinasi` `/planner` `/chat` `/login` `/register` terbuka tanpa error konsol
- [ ] Login admin `admin@travelit.com` / `admin123` berhasil → masuk `/admin`
- [ ] `/admin` menampilkan 4 kartu statistik berisi angka
- [ ] `/admin/artikel` dan `/admin/destinasi` terbuka
- [ ] Buat trip 3 hari dari `/planner` → berhasil, pindah ke `/trip/:id`
- [ ] Peta menampilkan marker bernomor, tombol hari berfungsi
- [ ] "Buat Ulang" menaikkan versi jadi 2, versi 1 masih ada di database
- [ ] Trip user lain membalas "Trip tidak ditemukan"
- [ ] Chat menjawab pertanyaan perjalanan dan menolak pertanyaan di luar topik
- [ ] Upload foto tempat menghasilkan struktur identifikasi
- [ ] Tidak ada string tema lama tersisa (Step 5)

Verifikasi versi lama benar-benar tersimpan:

```bash
node -e "
const { sequelize } = require('./models');
sequelize.query('SELECT tripId, version, totalEstimatedCost FROM itineraries ORDER BY tripId, version')
  .then(([r]) => { console.table(r); process.exit(0); });
"
```

Expected: untuk trip yang di-regenerate, ada **dua baris** dengan `version` 1 dan 2.

- [ ] **Step 7: Commit**

```bash
git add PRD.md README.md */README.md test/README.md
git commit -m "docs: tulis ulang seluruh dokumentasi untuk tema TrAvelIt"
```

---

## Catatan untuk pelaksana

**Urutan tidak boleh diacak.** Task 3 mengimpor `Activity.CATEGORIES` dari Task 2; Task 6 memakai keluaran Task 3, 4, dan 5; Task 10 memakai `GeoClient` dari Task 9.

**Kalau tidak ada koneksi internet:** Task 4 Step 5, Task 5 Step 4, Task 6 Step 7, dan seluruh verifikasi generate akan gagal. Itu bukan bug — catat, kerjakan task lain, ulangi verifikasinya saat online.

**Kalau `npm run db:reset` menolak menghapus file:** biasanya karena server masih jalan dan memegang file SQLite. Hentikan `npm run dev` dulu.

**Yang tidak boleh diubah tanpa alasan kuat:**
- Posisi mount `app.use('/api/chat', chatRoutes)` sebelum `express.json()` global
- Bentuk response `sendResponse()`
- Logika kompresi foto di `public/js/chat.js`
- Nama rute `/api/chat/detect`
