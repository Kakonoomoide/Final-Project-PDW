# controllers/

Jembatan HTTP request <-> logic bisnis. Tipis: validasi input, panggil
`services/`, bungkus hasilnya lewat `utils/response.js`.

- `auth.controller.js` — register, login, logout, me
- `page.controller.js` — serve semua file HTML dari `views/`
- `trip.controller.js` — perencana rute wisata (M5)
- `geo.controller.js` — proxy reverse geocode buat tombol "pakai lokasi saya"
- `admin.controller.js` — statistik agregat dashboard admin
- `chat.controller.js` — asisten perjalanan & identifikasi tempat (M5)

## Dua keputusan yang berlaku di semua controller

**404, bukan 403, buat resource milik orang lain.** Di
`trip.controller.js`, trip yang bukan milik user yang login dibalas
"Trip tidak ditemukan" — sama persis dengan trip yang memang tidak ada.
Membedakannya jadi 403 sama saja memberi tahu penyerang bahwa ID itu
ada dan milik orang lain.

**Validasi input ada di sini, bukan di service.** Service mengurus
logika; controller yang memutuskan apa yang boleh masuk. Contohnya
batas durasi 14 hari di `trip.controller.js` — batas itu ada karena
alasan teknis (respons AI kepanjangan, verifikasi Nominatim >2 menit),
dan alasannya ditulis sebagai komentar di sebelah angkanya.
