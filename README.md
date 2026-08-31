# PDW App

Template fullstack Express + SQLite + HTML/Bootstrap. Beda sama template
sebelumnya (Vite+React terpisah), ini **1 project monolitik** - Express
yang sekaligus serve halaman HTML dan API-nya, gak ada proses build/dev
server terpisah.

## Struktur
```
pdw-app/
├── app.js                      # entry point
├── config/                      # env variable & koneksi database (README sendiri)
├── models/                      # definisi tabel Sequelize (README sendiri)
├── controllers/                 # jembatan HTTP <-> logic bisnis (README sendiri)
├── services/                    # logic bisnis (README sendiri)
├── routes/                      # daftar endpoint & halaman (README sendiri)
├── seeders/                     # script isi data awal (README sendiri)
├── utils/                       # helper umum (README sendiri)
├── views/                       # halaman HTML (README sendiri)
├── public/js/                   # JS sisi client (README sendiri)
├── .env.example
└── package.json
```

Tiap folder punya README sendiri yang jelasin isi & fungsinya - buka
folder yang mau diutak-atik, baca README-nya dulu.

## Alur request-nya

```
Browser buka "/"
  -> routes/page.routes.js -> res.sendFile(views/index.html)
  -> browser render HTML, load public/js/main.js
  -> main.js fetch("/api/health")
       -> routes/health.routes.js
       -> controllers/health.controller.js
       -> services/health.service.js
       -> utils/response.js (bungkus jadi {code, success, message, data})
  -> main.js update tampilan (badge + JSON) langsung di DOM
```

## Cara install & jalanin

```bash
cp .env.example .env
npm install
npm run dev
```

Buka `http://localhost:3000` di browser. Server jalan pake `nodemon`,
jadi tiap ubah file otomatis restart, gak perlu matiin-nyalain manual.

## Kenapa SQLite

Gak butuh install/setup database server terpisah (beda sama
Postgres/MySQL) - datanya kesimpen di 1 file (`database.sqlite`) yang
otomatis kebuat sendiri pas server pertama kali jalan. Cocok banget
buat tugas kuliah/development, tinggal `npm install` langsung bisa jalan.

## Endpoint

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | / | Halaman utama (HTML) |
| GET | /api/health | Cek backend hidup - dipanggil `public/js/main.js` |

## Cara pake template ini buat project baru

1. **Nambah model**: liat `models/README.md`
2. **Nambah fitur (CRUD dst)**: bikin `services/<nama>.service.js` →
   `controllers/<nama>.controller.js` → `routes/<nama>.routes.js` →
   daftarin di `app.js`
3. **Nambah halaman**: liat `views/README.md`
4. **Isi data awal**: liat `seeders/README.md`, jalanin `npm run seed`
