# Design — TrAvelIt (retheme dari Tani Makmur)

Tanggal: 2026-09-03
Status: disetujui, siap diimplementasi

## 1. Tujuan

Mengubah tema repo Final Project PDW dari **Tani Makmur** (toko bahan
pertanian) menjadi **TrAvelIt** (AI Travel Planner) sesuai PPT
*Perancangan Sistem — Perencana Rute Wisata Kustom*, tanpa mengganti
tech stack, sambil menambahkan peta interaktif (Leaflet) dan
geolocation browser.

Referensi kunci PPT: Kotari, V. S., Soujanya A., Veenashree, Chabbi,
T., & Shwethasree R. (2025). *AI-Powered Travel Itinerary Planner Using
Next.js, TypeScript, Convex, and LLM Integration*. IJISRT, 10(11),
1157–1162. https://doi.org/10.38124/ijisrt/25nov927

## 2. Adaptasi stack

PPT memakai Next.js + TypeScript + Convex + PostgreSQL + Google Maps.
Repo ini memakai Express + SQLite + HTML/Bootstrap + Gemini. Slide 3
PPT sudah mengakui adaptasi semacam ini ("Convex diganti Node.js/Express
+ PostgreSQL, sementara pola Next.js–LLM–peta dipertahankan"), jadi
adaptasinya diteruskan:

| PPT | TrAvelIt | Alasan |
| --- | --- | --- |
| Next.js + TypeScript | HTML + Bootstrap + vanilla JS | Stack mata kuliah, tidak diubah |
| Convex | Express + Sequelize | Stack mata kuliah, tidak diubah |
| PostgreSQL | SQLite | Stack mata kuliah; relasi & versioning tetap sama |
| Google Maps / Routes | Leaflet + OpenStreetMap + Nominatim | Gratis, tanpa API key & tanpa kartu kredit |
| LLM (generik) | Gemini (`@google/genai`) | Sudah dipakai repo |

Pola inti yang **dipertahankan** dari key paper: input personal →
output terstruktur (JSON) → arsitektur berlapis dengan peta interaktif.

## 3. Ruang lingkup

**Dikerjakan:**

1. Retheme menyeluruh: semua string, nama tabel, rute, dokumentasi.
2. Implementasi penuh modul M5: trip planner + peta + geolocation +
   chat asisten travel + identifikasi tempat dari foto.
3. Skema database baru sesuai PPT.
4. Seeder berisi data destinasi & artikel wisata dummy.
5. Penulisan ulang `PRD.md` dan 12 file README.

**Tidak dikerjakan:** UI modul M1–M4 tetap placeholder (bertema travel),
karena itu jatah mahasiswa lain. Endpoint dan dokumentasi yang mereka
butuhkan tetap disiapkan.

## 4. Skema database

```
users ──┬── trips ──┬── preferences        (1:1)
        │           └── itineraries ── itinerary_days ── activities
        ├── chat_messages
        ├── destinations   (createdBy)
        └── articles       (createdBy)
```

### 4.1 `users` (tidak berubah)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | |
| name | STRING | |
| email | STRING unique | |
| password | STRING | hash bcrypt |
| role | STRING | `user` \| `admin`, default `user` |

### 4.2 `trips`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | |
| userId | INTEGER FK → users.id | pemilik trip |
| title | STRING | contoh "Liburan Bali 4 Hari" |
| destination | STRING | kota/daerah tujuan |
| originCity | STRING nullable | kota asal (boleh dari geolocation) |
| startDate | DATEONLY | |
| endDate | DATEONLY | |
| durationDays | INTEGER | diturunkan dari tanggal, disimpan agar query mudah |
| budget | INTEGER | rupiah, total untuk semua wisatawan |
| travelerCount | INTEGER | default 1 |
| status | STRING | `draft` \| `generated` \| `failed` |

### 4.3 `preferences` (1:1 dengan trip)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | |
| tripId | INTEGER FK unique | |
| interests | TEXT | JSON array string, contoh `["kuliner","pantai"]` |
| pace | STRING | `santai` \| `sedang` \| `padat` |
| specialNeeds | TEXT nullable | contoh "ramah kursi roda" |

Dipisah dari `trips` karena PPT slide 11 memisahkannya, dan karena
regenerate boleh mengubah preferensi tanpa menyentuh identitas trip.

### 4.4 `itineraries` (versi)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | |
| tripId | INTEGER FK | |
| version | INTEGER | mulai dari 1, naik tiap regenerate |
| totalEstimatedCost | INTEGER | |
| currency | STRING | default `IDR` |
| modelUsed | STRING | model Gemini saat generate |
| generatedAt | DATE | |

**Aturan konsistensi (PPT slide 11):** regenerate membuat baris versi
baru, tidak menimpa. Versi aktif = `version` tertinggi.

### 4.5 `itinerary_days`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | |
| itineraryId | INTEGER FK | |
| dayNumber | INTEGER | 1..n |
| date | DATEONLY | |
| summary | STRING | judul singkat hari itu |

### 4.6 `activities`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | |
| itineraryDayId | INTEGER FK | |
| orderNo | INTEGER | urutan dalam satu hari |
| startTime | STRING | `HH:MM` |
| name | STRING | nama tempat/aktivitas |
| category | STRING | `wisata`\|`kuliner`\|`transport`\|`penginapan`\|`lainnya` |
| description | TEXT | |
| estimatedCost | INTEGER | |
| lat / lng | FLOAT nullable | |
| placeVerified | BOOLEAN | hasil verifikasi Nominatim |
| distanceKmFromPrev | FLOAT nullable | jarak dari aktivitas sebelumnya |
| travelMinutesFromPrev | INTEGER nullable | estimasi waktu tempuh |

### 4.7 `destinations` (ex-`products`, jatah M3/M4)

| Kolom | Tipe |
| --- | --- |
| id, name, category, city, province, description, ticketPrice, lat, lng, imageUrl, createdBy |

`category` contoh: `pantai`, `gunung`, `budaya`, `kuliner`, `taman`.

### 4.8 `articles` (ex-`news`, jatah M1/M2)

| Kolom | Tipe |
| --- | --- |
| id, title, caption, content, imageUrl, createdBy |

### 4.9 `chat_messages` (bentuk tidak berubah)

Tetap `userId`, `role`, `content`, `hasImage`. Isinya sekarang
percakapan asisten perjalanan, bukan penyuluh pertanian.

## 5. Kontrak JSON dari Gemini

Sesuai slide 10 ("Backend menolak field wajib yang hilang dan tidak
menyimpan JSON mentah tanpa normalisasi"), Gemini diminta membalas
JSON dengan bentuk:

```json
{
  "destination": "Bali",
  "totalEstimatedCost": 3500000,
  "currency": "IDR",
  "days": [
    {
      "dayNumber": 1,
      "summary": "Tiba dan menyusuri Kuta",
      "activities": [
        {
          "startTime": "09:00",
          "name": "Pantai Kuta",
          "category": "wisata",
          "description": "...",
          "estimatedCost": 0,
          "coordinates": { "lat": -8.7184, "lng": 115.1686 }
        }
      ]
    }
  ]
}
```

Validasi di `services/itinerarySchema.js`:

1. `days` harus array tidak kosong dan panjangnya sama dengan
   `durationDays` milik trip.
2. Tiap hari wajib punya `dayNumber` dan `activities` tidak kosong.
3. Tiap aktivitas wajib punya `name`, `startTime`, `category`,
   `estimatedCost`.
4. `category` di luar daftar yang dikenal dinormalisasi jadi `lainnya`.
5. `coordinates` opsional di level AI — kalau hilang atau di luar
   rentang lat/lng yang sah, diisi lewat geocoding.
6. Kalau validasi gagal setelah retry, trip disimpan dengan
   `status: 'failed'` dan pesan error yang bisa dipahami user.

## 6. Verifikasi tempat (mitigasi "tempat halusinatif")

Slide 12 PPT menyebut risiko tempat halusinatif dengan mitigasi
"validasi geocode dan status tempat melalui Maps". Implementasinya:

1. Untuk tiap aktivitas, `geo.service.geocode("<nama>, <destinasi>")`
   memanggil Nominatim.
2. Kalau ketemu → `lat/lng` dipakai dari Nominatim,
   `placeVerified = true`.
3. Kalau tidak ketemu tapi Gemini memberi koordinat yang masuk akal →
   koordinat Gemini dipakai, `placeVerified = false`.
4. Kalau dua-duanya gagal → `lat/lng` null, aktivitas tetap tampil di
   daftar tapi tidak diplot di peta, dan diberi lencana
   "lokasi belum terverifikasi".

Aktivitas berkategori `transport` dilewati dari geocoding (bukan
tempat yang bisa dicari).

Nominatim punya kebijakan pemakaian: maksimal 1 request/detik dan wajib
mengirim `User-Agent` yang jelas. `geo.service.js` menegakkan keduanya
lewat antrian serial dan cache in-memory (banyak aktivitas menyebut
kota yang sama).

## 7. API

Semua `/api/trips/*` memakai `requireAuth`. Query trip **selalu**
menyertakan `userId` pemilik, sehingga trip milik orang lain membalas
404 — bukan 403, agar keberadaan ID tidak bocor. Ini memenuhi kriteria
slide 5: "akses trip dibatasi ke pemilik".

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| POST | `/api/trips/generate` | buat trip + generate itinerary versi 1 |
| GET | `/api/trips` | daftar trip milik user |
| GET | `/api/trips/:id` | detail trip + itinerary versi terbaru |
| PATCH | `/api/trips/:id` | ubah judul/tanggal/budget/preferensi |
| POST | `/api/trips/:id/regenerate` | buat itinerary versi baru |
| DELETE | `/api/trips/:id` | hapus trip beserta seluruh versinya |
| GET | `/api/geo/reverse?lat=&lng=` | reverse geocode untuk tombol "pakai lokasi saya" |
| GET | `/api/admin/stats` | ringkasan jumlah user/trip/destinasi (admin) |

Endpoint chat M5 tidak berubah bentuknya: `GET /api/chat/history`,
`POST /api/chat`, `POST /api/chat/detect`, `DELETE /api/chat/history`.

Endpoint yang **belum** dibuat dan menjadi jatah mahasiswa lain:
`/api/articles` (M2) dan `/api/destinations` (M4).

## 8. Halaman

| Rute | File | Modul |
| --- | --- | --- |
| `/` | `views/user/landing.html` | M1 (placeholder) |
| `/destinasi` | `views/user/destinations.html` | M3 (placeholder) |
| `/planner` | `views/user/planner.html` | M5 |
| `/trip/:id` | `views/user/trip.html` | M5 |
| `/chat` | `views/user/chat.html` | M5 |
| `/admin` | `views/admin/dashboard.html` | instruktur + statistik |
| `/admin/artikel` | `views/admin/articles.html` | M2 (placeholder) |
| `/admin/destinasi` | `views/admin/destinations.html` | M4 (placeholder) |

## 9. Geolocation

Dipakai di dua titik:

1. **Input** — tombol "Pakai lokasi saya" di form planner memanggil
   `navigator.geolocation.getCurrentPosition()`, lalu koordinatnya
   dikirim ke `GET /api/geo/reverse` untuk diubah jadi nama kota, dan
   mengisi field kota asal.
2. **Output** — di peta itinerary, posisi user ditandai marker terpisah
   sehingga terlihat relatif terhadap titik-titik aktivitas.

Geolocation ditangani sebagai **peningkatan opsional**: kalau user
menolak izin atau browsernya tidak mendukung, form dan peta tetap
berfungsi penuh, hanya tanpa marker/auto-isi.

Jarak antar aktivitas **tidak** memakai geolocation — dihitung haversine
dari koordinat aktivitas berurutan, lalu waktu tempuh diperkirakan
dengan asumsi kecepatan rata-rata kota 30 km/jam (dibulatkan ke atas,
minimum 5 menit). Angkanya ditampilkan sebagai estimasi, bukan klaim
rute sebenarnya.

## 10. Peta (Leaflet)

- Leaflet 1.9.4 lewat CDN unpkg, tile OpenStreetMap.
- Marker bernomor sesuai urutan aktivitas hari itu.
- Polyline menghubungkan aktivitas berurutan sebagai garis rute
  sederhana (bukan rute jalan sebenarnya — dijelaskan di UI).
- Filter per hari: memilih hari mengganti isi peta.
- Aktivitas tanpa koordinat tidak diplot, ditandai di daftar.

## 11. Peran admin

PPT tidak menyebut admin, tapi repo sudah punya. Admin diposisikan
sebagai **kurator konten**: mengelola katalog destinasi (M4) dan artikel
wisata (M2), plus dashboard statistik agregat.

Admin **tidak bisa** melihat isi trip user. Statistik hanya berupa
hitungan (`COUNT`), tidak menampilkan destinasi atau isi itinerary
siapa pun. Ini menjaga kriteria "akses trip dibatasi ke pemilik".

## 12. Migrasi & data lama

Repo memakai `sequelize.sync()`, bukan migrasi berversi. Karena
`products` → `destinations` dan `news` → `articles`, database SQLite
yang sudah ada akan menyimpan tabel lama yang tidak terpakai.

Penanganannya: menambah script `npm run db:reset` yang menghapus file
SQLite lalu menjalankan seeder ulang. File database milik user
**tidak** dihapus otomatis — hanya didokumentasikan di README, karena
menghapus data tanpa diminta bukan hak script.

Tabel lama yang menganggur tidak berbahaya (kosong, tidak direferensi),
jadi `npm run db:reset` bersifat opsional.

## 13. Nonfungsional (slide 5)

| Aspek | Implementasi |
| --- | --- |
| Keamanan | `GEMINI_API_KEY` hanya di server; password bcrypt; query trip selalu difilter `userId` |
| Validasi | Tanggal, durasi, budget, jumlah wisatawan divalidasi di controller; JSON AI divalidasi di `itinerarySchema.js` sebelum disimpan |
| Kinerja | Tombol terkunci + indikator loading selama generate; navigasi halaman tidak terblokir |
| Keandalan | `callWithRetry()` (sudah ada) untuk 503/429; timeout Nominatim; pesan error berbahasa manusia |
| Usability | Bootstrap 5 responsif; peta dan itinerary bisa dipindai per hari |
| Maintainability | `gemini.service`, `geo.service`, `trip.service`, `auth.service` terpisah; controller tetap tipis |

## 14. Risiko

| Risiko | Mitigasi |
| --- | --- |
| Tempat halusinatif | Verifikasi Nominatim + lencana "belum terverifikasi" (bagian 6) |
| JSON Gemini rusak | `responseMimeType: application/json` + validator + retry, gagal → `status: failed` |
| Estimasi biaya berubah | Ditampilkan sebagai estimasi, `generatedAt` disimpan |
| Rate limit Nominatim | Antrian 1 req/detik + cache; kegagalan geocode tidak menggagalkan generate |
| Trip bocor antar user | Filter `userId` di setiap query, balas 404 |

## 15. Definition of Done

1. Tidak ada lagi string "Tani Makmur" / "tanimakmur" / tema pertanian
   di seluruh repo (kode maupun dokumentasi).
2. `npm run seed` membuat admin TrAvelIt + destinasi & artikel dummy.
3. `/planner` bisa menghasilkan itinerary tersimpan, `/trip/:id`
   menampilkannya beserta peta Leaflet.
4. Regenerate menambah versi baru, versi lama tetap ada di database.
5. Trip milik user lain membalas 404.
6. `PRD.md` dan seluruh README mencerminkan sistem yang baru.
