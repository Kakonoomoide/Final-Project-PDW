# public/partials/

Potongan HTML (navbar, sidebar) yang di-reuse di banyak halaman,
di-inject lewat `public/js/include-partials.js` — bukan lewat template
engine, karena `views/` di project ini pakai HTML biasa.

- `navbar-user.html` — semua halaman publik (beranda, destinasi,
  rencana perjalanan, asisten AI)
- `navbar-admin.html` — semua halaman `/admin/*`
- `sidebar-admin.html` — semua halaman `/admin/*`

Cara pakai di HTML:

```html
<div data-include="/partials/navbar-user.html"></div>
```

Sidebar admin sengaja memuat link ke `/planner` dan `/chat` yang
sebenarnya halaman user, supaya admin tidak perlu keluar dulu ke situs
publik untuk mencobanya. Endpoint keduanya diproteksi `requireAuth`
(bukan `requireAdmin`), jadi admin bisa pakai.
