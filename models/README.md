# models/

Definisi tabel database (Sequelize). Struktur lengkap ada di `PRD.md` bagian 4.

- `user.model.js` - admin & user biasa (dibedain kolom `role`)
- `chatMessage.model.js` - riwayat chat konsultasi (M5)
- `product.model.js` - bahan pertanian (M3, M4)
- `news.model.js` - berita (M1, M2)

Kalo butuh tabel baru (misal riwayat chat buat M5), bikin file baru di sini
ngikutin pola yang sama, terus daftarin di `index.js`.
