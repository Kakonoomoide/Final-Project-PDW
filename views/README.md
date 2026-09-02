# views/

HTML biasa (bukan template engine), diserve `res.sendFile()` lewat
`controllers/page.controller.js`.

- `auth/` - login.html, register.html
- `admin/` - dashboard.html (udah jadi), news.html (M2), products.html (M4)
- `user/` - landing.html (M1), products.html (M3), chat.html (M5)

Tiap halaman baru WAJIB include `/js/include-partials.js` + navbar yang
sesuai (`navbar-admin.html` atau `navbar-user.html`) - liat contoh di
`admin/dashboard.html`. Detail caranya ada di README utama project.
