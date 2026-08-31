# PRD — Tani Makmur (Final Project PDW)

## 1. Latar Belakang

Aplikasi web toko bahan pertanian sederhana. Admin mengelola berita
seputar pertanian dan katalog bahan pertanian (bibit, pupuk, alat).
User biasa bisa baca berita, browse produk, dan konsultasi seputar
pertanian lewat chat AI. Beberapa fitur dibantu Gemini AI (rekomendasi
caption, deskripsi, konsultasi, dan deteksi hama/penyakit lewat foto).

## 2. Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Express.js |
| Database | SQLite (lewat Sequelize) |
| Views | HTML biasa + Bootstrap 5 (CDN) |
| Client-side JS | Vanilla JavaScript (fetch API) |
| AI | Gemini API (`@google/genai`) |
| Auth | express-session + bcrypt |

## 3. Pembagian Kerja

| # | Fitur | Penanggung Jawab |
|---|---|---|
| 1 | Login admin & register user biasa | Instruktur |
| 2 | Struktur database | Instruktur |
| 3 | Navbar & sidebar (admin + user) | Instruktur |
| 4 | Landing page user + widget cuaca & AI rekomendasi waktu tanam | Mahasiswa 1 |
| 5 | CRUD News (admin) + AI rekomendasi caption | Mahasiswa 2 |
| 6 | Browse bahan pertanian (user) + AI product finder (quiz) | Mahasiswa 3 |
| 7 | CRUD bahan pertanian (admin) + AI rekomendasi deskripsi | Mahasiswa 4 |
| 8 | Chat AI konsultasi pertanian + deteksi hama/penyakit via foto | Mahasiswa 5 |

## 4. Struktur Database

### Tabel `users`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | auto increment |
| name | STRING | |
| email | STRING | unique |
| password | STRING | hash (bcrypt) |
| role | STRING | `'user'` atau `'admin'`, default `'user'` |

Admin **tidak bisa didaftarkan lewat form publik** — cuma dibuat lewat
`npm run seed`. Ini prinsip keamanan: akun privileged gak boleh bisa
didaftarin sembarangan dari luar.

### Tabel `products` (bahan pertanian)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | |
| name | STRING | |
| category | STRING | contoh: `bibit`, `pupuk`, `alat` |
| description | TEXT | diisi manual atau dibantu AI (M4) |
| price | INTEGER | |
| stock | INTEGER | |
| imageUrl | STRING | opsional |
| createdBy | INTEGER (FK → users.id) | admin yang nambahin |

### Tabel `news`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER (PK) | |
| title | STRING | |
| caption | STRING | ringkasan pendek, bisa dibantu AI (M2) |
| content | TEXT | isi lengkap |
| imageUrl | STRING | opsional |
| createdBy | INTEGER (FK → users.id) | admin yang nambahin |

> **Catatan buat M1, M3, M5**: kalau butuh tabel tambahan (misal riwayat
> chat, hasil deteksi foto), silakan tambah model baru sendiri di
> `models/`, ikutin pola yang sama (lihat `models/README.md`).

## 5. Rincian Fitur per Mahasiswa

### M1 — Landing Page + Rekomendasi Waktu Tanam
- Landing page nampilin daftar berita terbaru (`GET /api/news`, dari M2)
- Widget cuaca (integrasi API cuaca eksternal, misal OpenWeatherMap)
- AI (Gemini, text generation) narasiin rekomendasi waktu/jenis tanam
  berdasarkan data cuaca yang didapat
- File: `views/user/landing.html`

### M2 — CRUD News + AI Caption
- CRUD berita di admin (create, read, update, delete)
- Tombol "Generate Caption dengan AI" — kirim judul/isi berita ke
  Gemini, dapetin beberapa opsi caption
- File: `views/admin/news.html`

### M3 — Browse Bahan Pertanian + AI Product Finder
- User bisa liat & filter katalog produk (`GET /api/products`, dari M4)
- Quiz singkat (2-3 pertanyaan) → AI kasih rekomendasi kategori/produk
  yang cocok berdasarkan jawaban
- File: `views/user/products.html`

### M4 — CRUD Bahan Pertanian + AI Deskripsi
- CRUD produk di admin
- Tombol "Generate Deskripsi dengan AI" — kirim nama+kategori produk
  ke Gemini, dapetin draft deskripsi
- File: `views/admin/products.html`

### M5 — Chat AI Konsultasi + Deteksi Hama/Penyakit
- Chat multi-turn seputar pertanian (pola sama kayak project
  `cs-bot-api`/`telegram-shop-bot` - system instruction + riwayat chat)
- Upload foto tanaman → Gemini Vision analisa & kasih diagnosis +
  saran penanganan
- File: `views/user/chat.html`

## 6. Dependency Antar Fitur

- **M3 butuh data dari M4** (tabel `products`). Struktur tabel udah
  disepakati di PRD ini dari awal, jadi M3 bisa mulai kerja pake data
  seed dummy tanpa nunggu M4 kelar CRUD-nya.
- **M1 butuh data dari M2** (tabel `news`) buat nampilin di landing page.
- Fitur lain (chat M5, deteksi foto M5, cuaca M1, quiz M3) independen,
  gak nunggu modul lain.

## 7. Autentikasi & Otorisasi

- Register (`POST /api/auth/register`) → selalu jadi role `user`
- Login (`POST /api/auth/login`) → satu endpoint buat admin & user,
  redirect beda tergantung `role` di response
- Halaman `/admin/*` diproteksi `requireAdminPage` (redirect ke
  `/login` kalo bukan admin/belum login)
- Endpoint API sensitif diproteksi `requireAuth`/`requireAdmin`
  (balikin JSON 401/403, bukan redirect)

## 8. Environment Variables

Lihat `.env.example` buat daftar lengkap. Yang penting:
- `GEMINI_API_KEY` — dipake SEMUA fitur AI (M1, M2, M3, M4, M5),
  satu key yang sama buat semua
- `WEATHER_API_KEY` — khusus M1
- `SESSION_SECRET` — buat login (instruktur)
- `DB_STORAGE` — path file SQLite (otomatis kebuat)

## 9. Definition of Done (per fitur mahasiswa)

Sebuah fitur dianggap selesai kalau:
1. Placeholder `<h1>` di file HTML terkait udah diganti UI beneran
2. Endpoint API yang dibutuhin (kalau ada) udah dibikin di
   `routes/` + `controllers/` + `services/`, ngikutin pola yang
   udah ada (`auth.*`)
3. Fitur AI (kalau ada) beneran manggil Gemini API, bukan data hardcode
4. Udah dites manual: jalanin `npm run dev`, buka halaman terkait,
   pastiin gak ada error di console browser maupun terminal
