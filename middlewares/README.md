# middlewares/

- `requireAuth` - buat endpoint API, balikin 401 JSON kalo belum login
- `requireAdmin` - buat endpoint API, balikin 403 JSON kalo bukan admin
- `requireAdminPage` - buat HALAMAN (bukan API), redirect ke `/login`
  kalo bukan admin - dipake di `admin.page.routes.js`
