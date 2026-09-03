# services/

Logic bisnis — query ke model, aturan, dipisah dari urusan HTTP.

- `auth.service.js` — `registerUser()`, `loginUser()`
- `gemini.service.js` — client Gemini yang dipakai BARENG semua fitur AI
  (M1–M5). Helper umum: `generate()` (sekali jalan, bisa sekalian kirim
  gambar), `chat()` (multi-turn), `generateJson()` (output JSON
  terstruktur), plus `callWithRetry()` yang otomatis mengulang kalau
  Gemini sibuk (503/429). Fungsi per modul: `generateCaption()` (M2),
  `generateDescription()` (M4).
- `geo.service.js` — Nominatim (geocode & reverse geocode) + haversine.
  **Semua panggilan Nominatim wajib lewat sini**, karena di file inilah
  aturan 1 request/detik dan header `User-Agent` ditegakkan. Nominatim
  memblokir IP yang melanggar.
- `article.service.js` — CRUD artikel wisata (M2)
- `browse-destination.service.js` — AI destination finder / quiz (M3)
- `destination.service.js` — CRUD katalog destinasi (M4), termasuk
  auto-geocode kalau koordinatnya dikosongkan
- `itinerarySchema.js` — kontrak JSON keluaran AI + validatornya. Murni
  fungsi, tanpa I/O, jadi bisa diuji beneran (`npm test`).
- `trip.service.js` — orkestrasi M5: generate → validasi → verifikasi
  tempat → simpan transaksional, plus versioning regenerate.
- `chat.service.js` — asisten perjalanan + identifikasi tempat dari foto
- `health.service.js` — status "sehat"-nya aplikasi

## Buat mahasiswa yang butuh Gemini

**JANGAN bikin client Gemini baru.** Tambah fungsi di
`gemini.service.js` lalu pakai helper yang sudah ada — dengan begitu
fitur kalian ikut kebagian retry otomatis pas Gemini lagi sibuk.
Contoh pemakaian ada di README utama.

## Tiga aturan yang tidak kelihatan dari kode

1. **Panggilan API di luar transaksi database.** Di `trip.service.js`,
   Gemini & Nominatim dipanggil SEBELUM `sequelize.transaction()`
   dibuka. Keduanya bisa makan puluhan detik, dan menahan transaksi
   SQLite selama itu mengunci database untuk semua request lain.
2. **Kegagalan geocoding tidak menggagalkan apa pun.**
   `geo.service.js` menelan error jaringan jadi `null`. Itinerary tanpa
   titik peta masih berguna; halaman error tidak. Sama halnya saat
   menyimpan destinasi di `destination.service.js` — destinasinya tetap
   tersimpan, cuma ditandai "belum dipetakan".
3. **AI cuma boleh memilih, bukan mengarang.** Di
   `browse-destination.service.js`, yang diminta ke Gemini hanya daftar
   ID dari katalog yang kita kirim — data destinasinya diambil ulang
   dari database. Jadi AI tidak bisa merekomendasikan tempat yang tidak
   ada di katalog.
