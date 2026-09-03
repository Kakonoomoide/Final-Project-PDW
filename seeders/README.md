# seeders/

`seed.js` mengisi database dengan:

1. Akun admin default — `admin@travelit.com` / `admin123`
2. 6 destinasi wisata dummy (lengkap dengan koordinat)
3. 3 artikel wisata dummy

```bash
npm run seed
```

Aman dijalankan berkali-kali — pakai `findOrCreate`, tidak bikin duplikat.

## Kenapa ada data dummy

Supaya M1 dan M3 bisa mulai kerja tanpa menunggu M2/M4 selesai bikin
CRUD-nya. Halaman browse destinasi dan landing page butuh isi tabel,
bukan tabel kosong.

Koordinat destinasi diisi manual, bukan hasil geocoding — supaya seeding
tidak butuh internet dan tidak kena antrian 1 request/detik Nominatim.

## Reset total

```bash
npm run db:reset
```

**Menghapus file SQLite** lalu seed ulang. Semua trip, riwayat chat, dan
akun user hilang. Matikan `npm run dev` dulu, kalau tidak file
databasenya sedang dipegang server dan gagal dihapus.

## Nambah data dummy sendiri

Tambahkan ke array `destinasiDummy` atau `artikelDummy` di file yang
sama, ikuti pola yang ada. Untuk destinasi, isi `lat`/`lng` juga supaya
bisa langsung diplot di peta.
