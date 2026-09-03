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
