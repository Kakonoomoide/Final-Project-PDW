# config/

Tempat semua konfigurasi aplikasi - environment variable dan koneksi
database. Isinya sengaja dipisah dari kode bisnis, biar gampang dicari
kalo mau ganti setting.

## Isi folder ini

- **`env.js`** - baca semua environment variable dari `.env` (lewat
  `dotenv`) dan expose sebagai satu object `config`. File LAIN yang
  butuh env variable import dari sini (`require('../config/env')`),
  BUKAN baca `process.env` langsung - biar ada 1 tempat yang jelasin
  env apa aja yang dipake project ini.

- **`database.js`** - setup koneksi Sequelize ke SQLite. Beda sama
  Postgres/MySQL, SQLite gak butuh server database terpisah - datanya
  kesimpen di 1 file lokal (`database.sqlite`, path-nya diatur lewat
  `DB_STORAGE` di `.env`). File ini export instance `sequelize` yang
  dipake `models/index.js` buat definisiin model-model.

## Kalo mau nambah config baru

Tambahin key baru di `config/env.js` (misal `jwtSecret`,
`uploadMaxSize`), jangan langsung `process.env.NAMA_VARIABLE` di file
lain.
