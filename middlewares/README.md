# middlewares/

- `requireAuth` — buat endpoint API, balikin 401 JSON kalau belum login
- `requireAdmin` — buat endpoint API, balikin 403 JSON kalau bukan admin
- `requireAdminPage` — buat HALAMAN (bukan API), **redirect** ke `/login`
  kalau bukan admin — dipakai di `admin.page.routes.js`

Bedanya penting: browser yang sedang navigasi ke sebuah halaman butuh
redirect, bukan JSON error yang tampil sebagai teks mentah di layar.

## Yang TIDAK ditangani middleware

Kepemilikan resource. `requireAuth` cuma memastikan "ada yang login",
bukan "yang login berhak atas data ini". Pengecekan kepemilikan trip
dilakukan di query — `services/trip.service.js` selalu menyertakan
`userId` di klausa `where`, sehingga trip orang lain tidak pernah
terambil sejak awal. Lihat `controllers/README.md` soal kenapa hasilnya
dibalas 404, bukan 403.
