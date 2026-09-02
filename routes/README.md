# routes/

- `auth.routes.js` - `/api/auth/*` (register, login, logout, me)
- `page.routes.js` - halaman publik (landing, login, register, produk, chat)
- `admin.page.routes.js` - halaman admin, diproteksi `requireAdminPage`

Route API baru dipasang di `app.js` dengan prefix `/api/<nama>`.
