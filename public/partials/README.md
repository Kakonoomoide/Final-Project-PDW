# public/partials/

Potongan HTML (navbar, sidebar) yang di-reuse di banyak halaman, di-inject
lewat `public/js/include-partials.js` (bukan lewat template engine, karena
`views/` di project ini pake HTML biasa).

- `navbar-admin.html` - dipake semua halaman `/admin/*`
- `sidebar-admin.html` - dipake semua halaman `/admin/*`
- `navbar-user.html` - dipake semua halaman publik (landing, produk, chat)

Cara pake di HTML: `<div data-include="/partials/navbar-user.html"></div>`
