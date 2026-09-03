# routes/

## Halaman (kirim file HTML)

- `page.routes.js` — halaman publik: `/`, `/login`, `/register`,
  `/destinasi`, `/planner`, `/trip/:id`, `/chat`
- `admin.page.routes.js` — halaman admin `/admin/*`, diproteksi
  `requireAdminPage` (redirect ke `/login`, bukan JSON error)

## API (kirim JSON)

- `auth.routes.js` — `/api/auth/*` (register, login, logout, me)
- `article.routes.js` — `/api/articles/*` (M2), baca publik, tulis `requireAdmin`
- `browse-destination.routes.js` — `/api/ai/destination-finder` (M3)
- `destination.routes.js` — `/api/destinations/*` (M4), baca publik, tulis `requireAdmin`
- `trip.routes.js` — `/api/trips/*` (M5), semuanya `requireAuth`
- `geo.routes.js` — `/api/geo/reverse` & `/api/geo/search`, `requireAuth`
- `admin.routes.js` — `/api/admin/stats`, `requireAdmin`
- `chat.routes.js` — `/api/chat/*` (M5), semuanya `requireAuth`

Route API baru dipasang di `app.js` dengan prefix `/api/<nama>`.

## Dua urutan yang tidak boleh diacak

**1. `chat.routes.js` dimount SEBELUM `express.json()` global.**
Endpoint identifikasi tempat menerima foto base64 yang bisa megabyte-an,
sedangkan `express.json()` default cuma menerima 100kb dan akan menolak
duluan sebelum request-nya sampai ke router chat. Router chat punya
parser sendiri dengan limit lebih besar. Alasan lengkapnya ada di
komentar `app.js`.

**2. Route spesifik didaftarkan SEBELUM `/:id`.** Berlaku di beberapa
tempat: `/generate` di `trip.routes.js`, `/generate-caption` di
`article.routes.js`, serta `/stats` dan `/ai-description` di
`destination.routes.js`. Kalau kebalik, Express akan menganggap kata
itu sebagai sebuah id.
