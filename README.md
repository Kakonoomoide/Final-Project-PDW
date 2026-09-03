# Tani Makmur — Final Project PDW

Toko bahan pertanian: Express + SQLite + HTML/Bootstrap + Gemini AI.
Kerjaan tim, pembagian fitur & detail lengkap ada di [`PRD.md`](./PRD.md).

## Yang udah jadi (dikerjain instruktur)

1. ✅ Login admin & register user biasa (session-based, 1 tabel `users`
   dibedain lewat `role`)
2. ✅ Struktur database (`users`, `products`, `news`)
3. ✅ Navbar & sidebar admin, navbar user (reusable lewat partial HTML)

## Yang masih placeholder (tinggal diisi tiap mahasiswa)

Semua halaman di bawah udah ke-wire navbar/sidebar-nya, tinggal ganti
`<h1>` placeholder-nya jadi UI beneran. Liat `PRD.md` bagian 5 buat
detail tiap fitur.

| Halaman | Mahasiswa | Fitur |
|---|---|---|
| `views/user/landing.html` | M1 | Landing page + cuaca + AI waktu tanam |
| `views/admin/news.html` | M2 | CRUD News + AI caption |
| `views/user/products.html` | M3 | Browse produk + AI product finder |
| `views/admin/products.html` | M4 | CRUD produk + AI deskripsi |
| ~~`views/user/chat.html`~~ | ~~M5~~ | ✅ **SELESAI** - Chat AI + deteksi hama/penyakit foto |

## Struktur folder
```
final-project-pdw/
├── app.js
├── config/          # env & koneksi database
├── models/          # users, products, news (Sequelize)
├── controllers/      # auth.controller.js, page.controller.js
├── services/         # auth.service.js
├── middlewares/       # requireAuth, requireAdmin, requireAdminPage
├── routes/            # auth.routes.js, page.routes.js, admin.page.routes.js
├── utils/             # response.js (format response seragam)
├── seeders/            # bikin akun admin default
├── views/
│   ├── auth/            # login.html, register.html
│   ├── admin/            # dashboard.html + placeholder M2, M4
│   └── user/              # placeholder M1, M3, M5
└── public/
    ├── js/                 # include-partials.js, navbar-auth.js, auth.js
    └── partials/            # navbar-admin.html, sidebar-admin.html, navbar-user.html
```

## Cara install & jalanin

```bash
cp .env.example .env
# isi GEMINI_API_KEY & WEATHER_API_KEY di .env (minta ke ketua tim/instruktur
# kalau belum ada, SATU key yang sama dipake bareng-bareng)

npm install
npm run seed    # bikin akun admin default
npm run dev
```

Buka `http://localhost:3000`.

**Login admin default** (dari seeder): `admin@tanimakmur.com` / `admin123`

## Cara kerja navbar/sidebar (penting dipahami sebelum nambah halaman)

Karena `views/` pake HTML biasa (bukan EJS), navbar/sidebar gak bisa
`<%- include(...) %>`. Solusinya: elemen `<div data-include="/partials/xxx.html">`
otomatis diisi isi file itu lewat `public/js/include-partials.js`
(fetch + inject ke DOM). Jadi tiap halaman baru, copy pola ini:

```html
<div data-include="/partials/navbar-user.html"></div>
<main class="container py-4">
  <h1>Halaman Baru</h1>
</main>
<script src="/js/include-partials.js"></script>
<script src="/js/navbar-auth.js"></script>
```

## Cara nambah endpoint API baru

Ikutin pola yang udah ada di `auth.*`:
1. `services/<nama>.service.js` — logic bisnis, query ke model
2. `controllers/<nama>.controller.js` — panggil service, balikin lewat `sendResponse()`
3. `routes/<nama>.routes.js` — daftarin path + method
4. Mount di `app.js`: `app.use('/api/<nama>', require('./routes/<nama>.routes'))`

## Fitur M5 - Chat AI Konsultasi + Deteksi Hama/Penyakit

Halaman: `/chat` (`views/user/chat.html`). Halamannya publik, tapi
endpoint-nya butuh LOGIN - kalo belum login yang muncul ajakan login,
bukan form chat. Alasannya tiap user punya riwayat chat sendiri, dan
endpoint AI gak boleh bisa dipanggil sembarang orang.

Admin juga bisa pake (link-nya ada di sidebar admin), karena
endpoint-nya diproteksi `requireAuth`, bukan `requireAdmin`.

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/chat/history` | ambil riwayat obrolan user yang lagi login |
| POST | `/api/chat` | kirim pesan teks, balas pake Gemini (multi-turn) |
| POST | `/api/chat/detect` | kirim foto tanaman, balas diagnosis + saran |
| DELETE | `/api/chat/history` | reset obrolan |

Catatan teknis:

- Riwayat chat disimpen di tabel `chat_messages` (`models/chatMessage.model.js`).
  20 pesan terakhir dikirim balik ke Gemini tiap request supaya AI-nya
  nyambung pas ditanya lanjutan - Gemini gak nyimpen konteks di sisi mereka.
- Fotonya di-resize di BROWSER (maksimal 1024px, JPEG) sebelum dikirim
  sebagai base64, jadi upload dari HP gak makan waktu lama.
- Foto **tidak** disimpen ke database (bikin bengkak), cuma hasil
  analisanya. Baris yang berasal dari foto ditandain kolom `hasImage`.

## Cara pake Gemini AI (buat M1, M2, M3, M4, M5)

Semua fitur AI pake API key yang sama (`GEMINI_API_KEY` di `.env`).

`services/gemini.service.js` **udah dibikin sama M5**, jadi mahasiswa lain
gak perlu bikin koneksi Gemini sendiri - tinggal import dari situ (DRY):

```js
const gemini = require('../services/gemini.service');

// sekali jalan (M2 caption, M4 deskripsi, M3 quiz)
const teks = await gemini.generate({
  contents: 'Bikinin 3 caption buat berita ini: ...',
  systemInstruction: 'Kamu editor berita pertanian.',
});

// multi-turn / ada riwayat (M5)
const balasan = await gemini.chat({ history, message, systemInstruction });
```

Tambah fungsi baru (`generateCaption()`, `generateDescription()`, dst)
di file yang sama, jangan bikin client Gemini baru.

> ⚠️ **Catatan versi `@google/genai`**: `package.json` awalnya pin ke
> `^0.5.0`, tapi versi 0.5.0 yang ada di npm itu rusak (tarball-nya gak
> berisi file JS sama sekali, jadi `require('@google/genai')` langsung
> error `MODULE_NOT_FOUND`). Udah dinaikin ke `^0.6.1` biar semua fitur
> AI (M1-M5) bisa jalan. Kalo abis `git pull` masih error modul,
> jalanin `npm install` lagi.

Contoh referensi cara pake `@google/genai` (chat multi-turn + function
calling) ada di project sebelumnya (`telegram-shop-bot`), bisa dicontek
polanya.
