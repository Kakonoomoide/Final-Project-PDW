# routes/

- `auth.routes.js` - `/api/auth/*` (register, login, logout, me)
- `page.routes.js` - halaman publik (landing, login, register, produk, chat)
- `admin.page.routes.js` - halaman admin, diproteksi `requireAdminPage`
- `chat.routes.js` - `/api/chat/*` (M5), semuanya diproteksi `requireAuth`.
  Router ini dimount SEBELUM `express.json()` global di `app.js` karena
  endpoint deteksi foto butuh limit body lebih gede - alasan lengkapnya
  ada di komentar `app.js`.

Route API baru dipasang di `app.js` dengan prefix `/api/<nama>`.
