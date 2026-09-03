# models/

Definisi tabel database (Sequelize). Struktur lengkap ada di `PRD.md` bagian 7.

## Inti

- `user.model.js` — admin & user biasa (dibedain kolom `role`)
- `index.js` — rangkai semua asosiasi, ekspor `{ sequelize, ...model }`

## Perencana rute wisata (M5)

- `trip.model.js` — permintaan perjalanan (tujuan, tanggal, budget, status)
- `preference.model.js` — minat, gaya perjalanan, kebutuhan khusus (1:1 trip)
- `itinerary.model.js` — **satu baris = satu VERSI** itinerary
- `itineraryDay.model.js` — hari ke-n dalam satu versi
- `activity.model.js` — aktivitas dalam satu hari (termasuk lat/lng & `placeVerified`)
- `chatMessage.model.js` — riwayat asisten perjalanan

## Konten kurasi admin

- `destination.model.js` — katalog destinasi (M3 browse, M4 CRUD)
- `article.model.js` — artikel/tips wisata (M1 tampil, M2 CRUD)

> Tabel `products` & `news` dari tema lama sudah diganti jadi
> `destinations` & `articles`. Kalau database lokalmu masih punya dua
> tabel usang itu, jalankan `npm run db:reset` (menghapus semua data).

## Kalau butuh tabel baru

Bikin file baru di sini ngikutin pola yang sama, terus **daftarkan di
`index.js`** — kalau lupa, tabelnya nggak akan pernah kebuat.

Dua hal yang gampang kelewat:

1. **CASCADE harus dipasang di TIAP tingkat.** SQLite nggak otomatis
   nurunin cascade lintas beberapa level, jadi rantai
   `trip → itinerary → day → activity` masing-masing punya
   `onDelete: 'CASCADE'` sendiri. Tanpa itu, hapus satu trip bakal
   ninggalin baris yatim yang numpuk diam-diam.
2. **Konten publik pakai `SET NULL`, bukan CASCADE.** Kalau akun admin
   dihapus, artikel & destinasinya jangan ikut hilang.
