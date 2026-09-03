# services/

Logic bisnis — query ke model, aturan, dipisah dari urusan HTTP.

- `auth.service.js` — `registerUser()`, `loginUser()`
- `gemini.service.js` — client Gemini yang dipakai BARENG semua fitur AI
  (M1–M5). Isinya `generate()` (sekali jalan, bisa sekalian kirim
  gambar), `chat()` (multi-turn), `generateJson()` (output JSON
  terstruktur), plus retry otomatis kalau Gemini lagi sibuk (503/429).
- `geo.service.js` — Nominatim (geocode & reverse geocode) + haversine.
  **Semua panggilan Nominatim wajib lewat sini**, karena di file inilah
  aturan 1 request/detik dan header `User-Agent` ditegakkan. Nominatim
  memblokir IP yang melanggar.
- `itinerarySchema.js` — kontrak JSON keluaran AI + validatornya. Murni
  fungsi, tanpa I/O, jadi bisa diuji beneran (`npm test`).
- `trip.service.js` — orkestrasi M5: generate → validasi → verifikasi
  tempat → simpan transaksional, plus versioning regenerate.
- `chat.service.js` — asisten perjalanan + identifikasi tempat dari foto
- `health.service.js` — status "sehat"-nya aplikasi

## Buat mahasiswa yang butuh Gemini

**JANGAN bikin client Gemini baru.** Tambah fungsi di
`gemini.service.js` (misal `generateCaption()` buat M2,
`generateDescription()` buat M4) lalu pakai helper yang sudah ada.
Contoh pemakaian ada di README utama.

## Dua aturan yang tidak kelihatan dari kode

1. **Panggilan API di luar transaksi database.** Di `trip.service.js`,
   Gemini & Nominatim dipanggil SEBELUM `sequelize.transaction()`
   dibuka. Keduanya bisa makan puluhan detik, dan menahan transaksi
   SQLite selama itu mengunci database untuk semua request lain.
2. **Kegagalan geocoding tidak menggagalkan generate.**
   `geo.service.js` menelan error jaringan jadi `null`. Itinerary tanpa
   titik peta masih berguna; halaman error tidak.
