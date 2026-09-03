# config/

- `env.js` — semua environment variable dibaca dari sini, bukan
  `process.env` tersebar di mana-mana
- `database.js` — koneksi Sequelize ke SQLite

Kalau nambah env variable baru (misal API key fitur baru), tambahkan di
`env.js` **dan** di `.env.example`, biar teman satu tim tahu harus isi apa.

## Isi `env.js`

| Kunci | Dipakai |
| --- | --- |
| `port`, `appName`, `sessionSecret`, `dbStorage` | server & database |
| `geminiApiKey`, `geminiModel` | semua fitur AI (M1–M5) |
| `weatherApiKey` | M1 (cuaca kota tujuan) |
| `nominatimBaseUrl`, `nominatimUserAgent` | M5 (verifikasi lokasi) |

Dua kunci Nominatim itu **tidak butuh API key** dan biasanya tidak perlu
diubah — hanya diisi kalau kalian nge-host instance Nominatim sendiri.
`nominatimUserAgent` wajib berisi identitas yang jelas; itu syarat
pemakaian Nominatim, bukan saran.

## Soal `geminiModel`

Default-nya `gemini-3.5-flash-lite`, dan itu keputusan sadar: kuota free
tier Gemini dihitung **per model**, dan model flash flagship terbaru
jatahnya cuma sekitar 20 request per hari — habis dalam hitungan menit
kalau dipakai satu tim.

Varian `-lite` jatahnya jauh lebih besar dan sudah diuji sanggup
mengerjakan semua fitur di project ini, termasuk yang paling menuntut:
generate itinerary JSON terstruktur dan identifikasi tempat dari foto.

Kalau kena pesan "Kuota AI lagi habis", tidak perlu menunggu tengah
malam — ganti `GEMINI_MODEL` di `.env` ke model lain, kuotanya dihitung
terpisah.
