# config/

- `env.js` - semua environment variable dibaca dari sini, bukan `process.env` tersebar
- `database.js` - koneksi Sequelize ke SQLite

Kalo nambah env variable baru (misal API key fitur baru), tambahin di `env.js`.
