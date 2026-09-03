# views/

HTML biasa (bukan template engine), diserve `res.sendFile()` lewat
`controllers/page.controller.js`.

| File | Rute | Modul | Status |
| --- | --- | --- | --- |
| `auth/login.html` | `/login` | instruktur | ✅ |
| `auth/register.html` | `/register` | instruktur | ✅ |
| `user/landing.html` | `/` | M1 | placeholder |
| `user/destinations.html` | `/destinasi` | M3 | ✅ |
| `user/planner.html` | `/planner` | M5 | ✅ |
| `user/trip.html` | `/trip/:id` | M5 | ✅ |
| `user/chat.html` | `/chat` | M5 | ✅ |
| `admin/dashboard.html` | `/admin` | instruktur | ✅ |
| `admin/articles.html` | `/admin/artikel` | M2 | ✅ |
| `admin/destinations.html` | `/admin/destinasi` | M4 | ✅ |

Tiap halaman baru **wajib** include `/js/include-partials.js` + navbar
yang sesuai (`navbar-admin.html` atau `navbar-user.html`) — lihat contoh
di `admin/dashboard.html`. Detail caranya ada di README utama.

Tinggal `user/landing.html` (M1) yang masih placeholder; isinya sudah
berisi komentar TODO yang menyebutkan endpoint dan model apa yang
tersedia untuk modul itu.

`user/destinations.html` script-nya ditulis inline karena cuma dipakai
halaman itu sendiri. Halaman lain punya file JS terpisah di
`public/js/`.
