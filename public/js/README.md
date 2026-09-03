# public/js/

JS yang jalan di browser (client-side), diserve statis lewat `/js/*.js`.

- `include-partials.js` — inject navbar/sidebar dari `public/partials/`
  ke elemen `data-include`. **WAJIB** di-include di semua halaman.
- `navbar-auth.js` — tampilkan status login (Halo, nama / Login-Register)
  di navbar, handle tombol logout
- `auth.js` — handle submit form login & register
- `articles.js` — halaman `/admin/artikel` (M2): CRUD artikel + pilih
  caption hasil AI
- `admin-destinations.js` — halaman `/admin/destinasi` (M4): CRUD
  destinasi, AI deskripsi, dan tombol cari koordinat
- `geo-client.js` — pembungkus `navigator.geolocation`: `minta()`,
  `reverse()`, `tersedia()`. Dipakai bareng planner & halaman trip.
- `planner.js` — halaman `/planner` (M5): form preferensi, daftar
  rencana, tombol geolocation
- `trip-map.js` — halaman `/trip/:id` (M5): itinerary per hari + peta Leaflet
- `chat.js` — halaman `/chat` (M5): kirim pesan, render riwayat, dan
  kompres foto di browser sebelum diupload

Halaman browse destinasi (M3) script-nya ditulis inline di
`views/user/destinations.html` karena cuma dipakai halaman itu.

Mahasiswa yang bikin fitur baru bikin file JS baru di sini, jangan
numpuk semua logic di 1 file.

## Tiga hal yang gampang bikin bug di sini

1. **Escape teks sebelum masuk `innerHTML`.** Nama tempat dari AI dan
   judul dari user dirakit pakai `innerHTML` — tanpa escape, teks yang
   mengandung `<` atau `>` bakal ke-render jadi tag HTML beneran. Tiap
   file yang perlu udah punya helper `escapeHtml()`.
2. **Geolocation itu opsional, bukan syarat.** User berhak menolak izin,
   browsernya bisa nggak dukung, dan Chrome cuma mengizinkannya di
   `https` atau `localhost`. Halaman harus tetap jalan penuh tanpanya —
   lihat cara `planner.js` menampilkan kegagalan sebagai teks kecil di
   bawah field, bukan `alert()` yang menyetop user.
3. **`fitBounds` pada layer kosong melempar error.** Di `trip-map.js`,
   hari yang nggak punya satu pun aktivitas berkoordinat sengaja
   di-`return` lebih awal — kalau nggak, `getBounds()` bakal error dan
   mematikan seluruh script, bukan cuma petanya.
