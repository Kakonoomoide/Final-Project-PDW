# PRD — TrAvelIt (Final Project PDW)

**Perencana Rute Wisata Kustom berbasis AI**

## 1. Latar Belakang

Perencanaan wisata masih terfragmentasi. Untuk menyusun satu perjalanan,
orang berpindah-pindah antara blog, peta, situs harga, dan ulasan —
lalu menggabungkannya sendiri di kepala. Tiga masalah yang muncul:

1. **Informasi tersebar.** Tidak ada satu tempat yang menggabungkan
   tempat, jarak, biaya, dan jadwal sekaligus.
2. **Rencana tidak konsisten.** Waktu tempuh, budget, dan jam kunjungan
   sering tidak selaras — jadwal yang terlihat rapi di catatan ternyata
   mustahil dijalani.
3. **Beban keputusan tinggi.** Semakin banyak pilihan, semakin sulit
   menyusun urutan yang masuk akal.

**Tesis rancangan:** satu formulir perjalanan harus menghasilkan
itinerary harian, estimasi biaya, dan rute peta — lalu menyimpannya agar
dapat diedit atau dibuat ulang.

TrAvelIt adalah aplikasi web yang mengubah tujuan, durasi, anggaran, dan
minat menjadi itinerary harian yang terstruktur dan dapat dipetakan.

## 2. Landasan Akademik

**Key paper:**

> Kotari, V. S., Soujanya A., Veenashree, Chabbi, T., & Shwethasree R.
> (2025). *AI-Powered Travel Itinerary Planner Using Next.js, TypeScript,
> Convex, and LLM Integration*. IJISRT, 10(11), 1157–1162.
> https://doi.org/10.38124/ijisrt/25nov927

Tiga temuan yang dipakai:

| # | Temuan | Penerapan di TrAvelIt |
| --- | --- | --- |
| 1 | **Input personal** — tujuan, durasi, budget, dan minat menjadi konteks generasi | Formulir di `/planner`, disimpan di tabel `trips` + `preferences` |
| 2 | **Output terstruktur** — aktivitas per hari, deskripsi tempat, waktu tempuh, koordinat, rute | Kontrak JSON di `services/itinerarySchema.js`, disimpan berjenjang di `itineraries` → `itinerary_days` → `activities` |
| 3 | **Arsitektur modern** — frontend, backend, autentikasi, LLM, peta interaktif | Express + session auth + Gemini + Leaflet |

### Adaptasi stack

Paper aslinya memakai Next.js + TypeScript + Convex + PostgreSQL +
Google Maps. Paper itu sendiri sudah mencontohkan penggantian komponen
("Convex diganti Node.js/Express + PostgreSQL, sementara pola
Next.js–LLM–peta dipertahankan"), dan adaptasi itu diteruskan di sini
agar cocok dengan stack mata kuliah:

| Paper | TrAvelIt | Alasan |
| --- | --- | --- |
| Next.js + TypeScript | HTML + Bootstrap 5 + vanilla JS | Stack mata kuliah |
| Convex | Express + Sequelize | Stack mata kuliah |
| PostgreSQL | SQLite | Stack mata kuliah; relasi & versioning tetap sama |
| Google Maps / Routes API | Leaflet + OpenStreetMap + Nominatim | Gratis, tanpa API key dan tanpa kartu kredit |
| LLM (generik) | Gemini (`@google/genai`) | Sudah dipakai seluruh modul M1–M5 |

**Pola inti yang dipertahankan:** input personal → output JSON
terstruktur → arsitektur berlapis dengan peta interaktif.

## 3. Tech Stack

| Layer | Teknologi |
| --- | --- |
| Backend | Express.js |
| Database | SQLite (lewat Sequelize) |
| Views | HTML biasa + Bootstrap 5 (CDN) |
| Client-side JS | Vanilla JavaScript (fetch API) |
| AI | Gemini API (`@google/genai`) |
| Peta | Leaflet 1.9.4 (CDN) + tile OpenStreetMap |
| Geocoding | Nominatim (OpenStreetMap), tanpa API key |
| Geolocation | `navigator.geolocation` bawaan browser |
| Auth | express-session + bcrypt |
| Test | `node:test` (bawaan Node 18+, tanpa dependency) |

## 4. Pembagian Kerja

| # | Fitur | Penanggung Jawab |
| --- | --- | --- |
| 1 | Login admin & register user biasa | Instruktur |
| 2 | Struktur database | Instruktur |
| 3 | Navbar & sidebar (admin + user) | Instruktur |
| 4 | Landing page user + widget cuaca kota tujuan & AI rekomendasi waktu berkunjung | M1 [4D1FK4](https://github.com/4D1FK4) |
| 5 | CRUD Artikel wisata (admin) + AI rekomendasi caption | M2 [nabilaghnaaa](https://github.com/nabilaghnaaa) |
| 6 | Browse destinasi (user) + AI destination finder (quiz) | M3 [variannn340](https://github.com/variannn340) |
| 7 | CRUD Destinasi (admin) + AI rekomendasi deskripsi | M4 [Dhandha Dendriya](https://github.com/DhandhaDendriyaE) |
| 8 | **Perencana rute wisata** (itinerary + peta + geolocation) + asisten perjalanan + identifikasi tempat via foto | M5 [PannnTastic](https://github.com/PannnTastic) |

## 5. Kebutuhan Fungsional

Mengikuti alur sistem:

| INPUT | PROSES | OUTPUT |
| --- | --- | --- |
| Registrasi dan login | Validasi input | Jadwal aktivitas per hari |
| Tujuan, tanggal/durasi, budget | Generate itinerary melalui LLM | Estimasi biaya dan peta |
| Jumlah wisatawan dan minat | Hitung koordinat, jarak, dan rute | Simpan, riwayat, edit, regenerate |

**User journey minimal:**

```
Login → isi preferensi → generate → lihat itinerary & peta → simpan / regenerate
```

## 6. Kebutuhan Nonfungsional

| Aspek | Kriteria penerimaan MVP | Cara dipenuhi |
| --- | --- | --- |
| Keamanan | API key hanya di server; password di-hash; akses trip dibatasi ke pemilik | `GEMINI_API_KEY` tidak pernah dikirim ke browser; bcrypt; setiap query `Trip` menyertakan `userId`, trip orang lain dibalas **404** (bukan 403, agar keberadaan ID tidak bocor) |
| Validasi | Tanggal, budget, durasi, dan respons JSON diperiksa sebelum disimpan | `controllers/trip.controller.js` untuk input; `services/itinerarySchema.js` untuk keluaran AI |
| Kinerja | Loading state tersedia; proses AI tidak memblokir navigasi | Overlay dengan estimasi waktu jujur (20–60 detik); tombol dikunci selama proses |
| Keandalan | Timeout, retry terbatas, rate limit, pesan error yang dapat dipahami | `callWithRetry()` untuk 503/429; timeout 8 detik ke Nominatim; retry generate maksimal 2× |
| Usability | Responsif di desktop/mobile; itinerary dan peta mudah dipindai | Bootstrap 5 grid; accordion per hari; filter peta per hari |
| Maintainability | Service AI, peta, autentikasi, dan database dipisahkan secara modular | `gemini.service`, `geo.service`, `trip.service`, `auth.service` terpisah; controller tetap tipis |

## 7. Struktur Database

```
users ──┬── trips ──┬── preferences        (1:1)
        │           └── itineraries ── itinerary_days ── activities
        ├── chat_messages
        ├── destinations   (createdBy)
        └── articles       (createdBy)
```

### Tabel `users`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER (PK) | auto increment |
| name | STRING | |
| email | STRING | unique |
| password | STRING | hash (bcrypt) |
| role | STRING | `'user'` atau `'admin'`, default `'user'` |

Admin **tidak bisa didaftarkan lewat form publik** — hanya dibuat lewat
`npm run seed`. Prinsip keamanan: akun privileged tidak boleh bisa
didaftarkan sembarangan dari luar.

### Tabel `trips`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER (PK) | |
| userId | INTEGER (FK → users.id) | pemilik trip |
| title | STRING | |
| destination | STRING | kota/daerah tujuan |
| originCity | STRING | boleh diisi dari geolocation |
| startDate / endDate | DATEONLY | |
| durationDays | INTEGER | inklusif (1–3 Okt = 3 hari) |
| budget | INTEGER | rupiah, total semua wisatawan |
| travelerCount | INTEGER | default 1 |
| status | STRING | `draft` \| `generated` \| `failed` |
| lastError | STRING | pesan gagal terakhir, biar user bisa "coba lagi" |

### Tabel `preferences` (1:1 dengan trip)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER (PK) | |
| tripId | INTEGER (FK, unique) | |
| interests | TEXT | JSON array (SQLite tidak punya tipe array) |
| pace | STRING | `santai` \| `sedang` \| `padat` |
| specialNeeds | TEXT | opsional |

### Tabel `itineraries` (versi)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER (PK) | |
| tripId | INTEGER (FK) | |
| version | INTEGER | mulai 1, naik tiap regenerate |
| totalEstimatedCost | INTEGER | |
| currency | STRING | default `IDR` |
| modelUsed | STRING | model Gemini saat generate |
| generatedAt | DATE | |

> **Aturan konsistensi:** satu itinerary tersimpan sebagai satu versi
> utuh; regenerate membuat versi baru, **bukan menimpa riwayat**. Versi
> yang ditampilkan adalah `version` tertinggi.

### Tabel `itinerary_days`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER (PK) | |
| itineraryId | INTEGER (FK) | |
| dayNumber | INTEGER | 1..n |
| date | DATEONLY | dihitung server dari `startDate`, bukan dari AI |
| summary | STRING | judul singkat hari itu |

### Tabel `activities`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER (PK) | |
| itineraryDayId | INTEGER (FK) | |
| orderNo | INTEGER | urutan dalam satu hari |
| startTime | STRING | `HH:MM` |
| name | STRING | |
| category | STRING | `wisata`\|`kuliner`\|`transport`\|`penginapan`\|`lainnya` |
| description | TEXT | |
| estimatedCost | INTEGER | rupiah |
| lat / lng | FLOAT | boleh null kalau tempatnya tidak ditemukan |
| placeVerified | BOOLEAN | true kalau ketemu di OpenStreetMap |
| distanceKmFromPrev | FLOAT | haversine, dihitung server |
| travelMinutesFromPrev | INTEGER | perkiraan, asumsi 30 km/jam |

### Tabel `destinations` (jatah M3 & M4)

| Kolom | Tipe |
| --- | --- |
| id, name, category, city, province, description, ticketPrice, lat, lng, imageUrl, createdBy |

`category`: `pantai`, `gunung`, `budaya`, `kuliner`, `taman`, `lainnya`.
Kolom `lat`/`lng` ada supaya destinasi bisa langsung diplot di peta
tanpa geocoding ulang.

### Tabel `articles` (jatah M1 & M2)

| Kolom | Tipe |
| --- | --- |
| id, title, caption, content, imageUrl, createdBy |

### Tabel `chat_messages` (M5)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id, userId, role, content | | `role`: `user` \| `model` |
| hasImage | BOOLEAN | penanda baris berasal dari foto |

> **Catatan buat M1–M4:** kalau butuh tabel tambahan, silakan tambah
> model baru di `models/`, ikuti pola yang sama lalu daftarkan di
> `models/index.js` (lihat `models/README.md`).

## 8. API

### Sudah tersedia

| Method | Endpoint | Proteksi | Keterangan |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | — | selalu jadi role `user` |
| POST | `/api/auth/login` | — | satu endpoint untuk admin & user |
| POST | `/api/auth/logout` | — | |
| GET | `/api/auth/me` | — | dipakai navbar |
| POST | `/api/trips/generate` | `requireAuth` | buat trip + itinerary versi 1 |
| GET | `/api/trips` | `requireAuth` | daftar trip milik user |
| GET | `/api/trips/:id` | `requireAuth` | detail + itinerary terbaru |
| GET | `/api/trips/:id/versions` | `requireAuth` | daftar versi |
| PATCH | `/api/trips/:id` | `requireAuth` | ubah data trip |
| POST | `/api/trips/:id/regenerate` | `requireAuth` | buat versi baru |
| DELETE | `/api/trips/:id` | `requireAuth` | hapus trip + semua versinya |
| GET | `/api/geo/reverse?lat=&lng=` | `requireAuth` | koordinat → nama kota |
| GET | `/api/chat/history` | `requireAuth` | riwayat asisten |
| POST | `/api/chat` | `requireAuth` | kirim pesan teks |
| POST | `/api/chat/detect` | `requireAuth` | kirim foto tempat |
| DELETE | `/api/chat/history` | `requireAuth` | reset obrolan |
| GET | `/api/admin/stats` | `requireAdmin` | hitungan agregat |

### Modul M2, M3, M4

| Method | Endpoint | Proteksi | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/articles` · `/api/articles/:id` | — | daftar & detail artikel (M2) |
| POST/PUT/DELETE | `/api/articles` · `/api/articles/:id` | `requireAdmin` | CRUD artikel (M2) |
| POST | `/api/articles/generate-caption` | `requireAdmin` | AI caption (M2) |
| POST | `/api/ai/destination-finder` | — | AI quiz rekomendasi (M3) |
| GET | `/api/destinations` · `/api/destinations/:id` | — | katalog & detail (M4) |
| GET | `/api/destinations/stats` | — | statistik katalog (M4) |
| POST/PUT/DELETE | `/api/destinations` · `/api/destinations/:id` | `requireAdmin` | CRUD destinasi (M4) |
| POST | `/api/destinations/ai-description` | `requireAdmin` | AI deskripsi (M4) |
| GET | `/api/geo/search?q=` | `requireAuth` | nama tempat → koordinat |

Endpoint baca (`GET`) untuk artikel & destinasi sengaja dibuka tanpa
login, karena landing page (M1) dan halaman browse (M3) harus bisa
menampilkan isinya ke pengunjung yang belum punya akun. Tulis, ubah, dan
hapus tetap khusus admin.

## 9. Rincian Fitur per Mahasiswa

### M1 — Landing Page + Rekomendasi Waktu Berkunjung

- Landing page menampilkan artikel wisata terbaru (`GET /api/articles`, dari M2)
- Widget cuaca kota tujuan (API cuaca eksternal, misal OpenWeatherMap)
- AI (Gemini) menarasikan rekomendasi waktu berkunjung berdasarkan data cuaca itu
- File: `views/user/landing.html`

### M2 — CRUD Artikel + AI Caption ✅ SELESAI

- CRUD artikel wisata di admin (create, read, update, delete)
- Tombol "Generate Caption dengan AI" — kirim judul/isi ke Gemini, dapat beberapa opsi
- File: `views/admin/articles.html`, model `models/article.model.js`

### M3 — Browse Destinasi + AI Destination Finder ✅ SELESAI

- User bisa lihat & filter katalog destinasi (`GET /api/destinations`, dari M4)
- Quiz singkat (2–3 pertanyaan) → AI merekomendasikan kategori/destinasi yang cocok
- Opsional: tabel `destinations` sudah punya `lat`/`lng`, jadi bisa dipetakan
  dengan Leaflet (contoh: `public/js/trip-map.js`) dan diurutkan berdasarkan
  jarak dari user (helper: `public/js/geo-client.js`)
- File: `views/user/destinations.html`

### M4 — CRUD Destinasi + AI Deskripsi ✅ SELESAI

- CRUD destinasi di admin
- Tombol "Generate Deskripsi dengan AI" — kirim nama + kategori + kota ke Gemini
- Kolom `lat`/`lng` bisa diisi manual atau lewat `geo.geocode()`
- File: `views/admin/destinations.html`, model `models/destination.model.js`

### M5 — Perencana Rute Wisata + Asisten Perjalanan ✅ SELESAI

- Form preferensi + tombol geolocation "pakai lokasi saya" (`/planner`)
- Generate itinerary harian via Gemini JSON, divalidasi sebelum disimpan
- Verifikasi tiap tempat ke Nominatim, jarak antar aktivitas via haversine
- Peta Leaflet dengan marker bernomor, polyline, filter per hari,
  dan marker posisi user (`/trip/:id`)
- Regenerate menghasilkan versi baru tanpa menghapus versi lama
- Chat asisten perjalanan multi-turn + identifikasi tempat dari foto (`/chat`)

## 10. Alur Integrasi AI & Data

### Kontrak output

```
destination · totalEstimatedCost · currency · days[] · activities[] · coordinates
```

Gemini dipanggil dengan `responseMimeType: 'application/json'` dan
`responseSchema` (lihat `services/itinerarySchema.js`), sehingga yang
kembali adalah JSON — bukan prosa yang kebetulan mirip JSON.

### Validasi sebelum disimpan

Backend **menolak field wajib yang hilang dan tidak menyimpan JSON
mentah tanpa normalisasi.** Aturannya dipisah dua:

| Jenis masalah | Tindakan | Contoh |
| --- | --- | --- |
| Membuat itinerary tidak berguna | **TOLAK** | `days` kosong, hari tanpa aktivitas, aktivitas tanpa nama, jumlah hari ≠ durasi trip |
| Hanya membuat jelek | **BETULKAN** | kategori tak dikenal → `lainnya`, jam ngawur → `null`, koordinat mustahil → `null`, biaya negatif → `0`, `dayNumber` acak → diurutkan `1..n` |

Kalau validasi gagal, prompt diulang **sekali** dengan daftar
kesalahannya dilampirkan. Kalau masih gagal, trip disimpan dengan
`status: 'failed'` dan pesan yang bisa dipahami — trip tidak dihapus,
supaya user bisa menekan "Coba lagi" tanpa mengisi ulang formulir.

### Verifikasi tempat

Mitigasi risiko **tempat halusinatif**: model bahasa bisa menyebut
tempat yang tidak ada dengan nada sangat yakin.

1. Tiap aktivitas dicari ke Nominatim (`nama, destinasi`)
2. Ketemu → koordinat dari Nominatim, `placeVerified = true`
3. Tidak ketemu tapi AI memberi koordinat sah → koordinat AI dipakai,
   `placeVerified = false`, UI memberi lencana peringatan (marker oranye)
4. Keduanya gagal → tidak diplot di peta, ditandai di daftar

Aktivitas berkategori `transport` dilewati (bukan tempat yang bisa dicari).

## 11. Peran Admin

Admin diposisikan sebagai **kurator konten**: mengelola katalog destinasi
(M4) dan artikel wisata (M2), plus dashboard statistik agregat.

Admin **tidak bisa** melihat isi rencana perjalanan pengguna.
`GET /api/admin/stats` hanya mengembalikan `COUNT`, tidak satu pun query
yang mengembalikan baris trip. Ini menjaga kriteria nonfungsional
"akses trip dibatasi ke pemilik".

## 12. Rancangan Implementasi

Empat increment:

| # | Tahap | Isi |
| --- | --- | --- |
| 01 | **Fondasi** | Repo, Express, SQLite, Sequelize, autentikasi session |
| 02 | **Core trip** | Model domain, form preferensi, CRUD trip, riwayat & detail |
| 03 | **Integrasi** | LLM JSON, Nominatim, Leaflet, perhitungan biaya & jarak |
| 04 | **Hardening** | Validasi, retry, timeout, responsif, pengujian |

### Risiko utama dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Tempat halusinatif | Verifikasi geocode ke Nominatim + lencana "belum terverifikasi" (bagian 10) |
| JSON AI rusak | `responseSchema` + validator + retry; gagal → `status: failed`, bukan data rusak |
| Estimasi biaya berubah | Ditampilkan sebagai estimasi; `generatedAt` & `modelUsed` disimpan |
| Rate limit / timeout | Antrian 1 req/detik ke Nominatim, cache, timeout 8 detik; `callWithRetry()` untuk 503/429 Gemini |
| Data pengguna bocor | API key server-side; otorisasi per trip lewat filter `userId`; balas 404 bukan 403 |

## 13. Environment Variables

Lihat `.env.example` untuk daftar lengkap. Yang penting:

- `GEMINI_API_KEY` — dipakai **semua** fitur AI (M1–M5), satu key untuk satu tim
- `WEATHER_API_KEY` — khusus M1 (cuaca kota tujuan)
- `SESSION_SECRET` — untuk login
- `DB_STORAGE` — path file SQLite (otomatis dibuat)
- `NOMINATIM_BASE_URL` / `NOMINATIM_USER_AGENT` — **tidak butuh API key**,
  biasanya tidak perlu diubah

## 14. Definition of Done (per fitur mahasiswa)

Sebuah fitur dianggap selesai kalau:

1. Placeholder `<h1>` di file HTML terkait sudah diganti UI beneran
2. Endpoint API yang dibutuhkan sudah dibuat di `routes/` + `controllers/`
   + `services/`, mengikuti pola yang sudah ada (`auth.*`, `trip.*`)
3. Fitur AI (kalau ada) benar-benar memanggil Gemini API, bukan data hardcode
4. Sudah dites manual: jalankan `npm run dev`, buka halaman terkait,
   pastikan tidak ada error di console browser maupun terminal
5. Tidak ada string tema lama ("Tani Makmur", istilah pertanian) yang
   ikut masuk
