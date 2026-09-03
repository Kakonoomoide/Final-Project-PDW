# public/js/

JS yang jalan di browser (client-side), diserve statis lewat `/js/*.js`.

- `include-partials.js` - inject navbar/sidebar dari `public/partials/`
  ke elemen `data-include`. WAJIB di-include di semua halaman.
- `navbar-auth.js` - tampilin status login (Halo, nama / Login-Register)
  di navbar, handle tombol logout
- `auth.js` - handle submit form login & register
- `chat.js` - halaman chat AI (M5): kirim pesan, render riwayat, dan
  kompres foto di browser sebelum diupload buat deteksi hama/penyakit

Mahasiswa yang bikin fitur baru (chat, CRUD, dll) bikin file JS baru
di sini, jangan numpuk semua logic di 1 file.
