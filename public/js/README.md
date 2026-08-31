# public/js/

Kode JavaScript yang jalan di **browser** (client-side), bukan di
server. Folder `public/` diserve langsung sama Express
(`app.use(express.static('public'))`), jadi file `public/js/main.js`
bisa diakses browser lewat `/js/main.js`.

## Isi folder ini

- **`main.js`** - `checkHealth()`, fetch ke `/api/health`, terus update
  teks & warna badge status langsung di DOM (`document.getElementById`).
  Dipanggil otomatis pas halaman dibuka (`DOMContentLoaded`), dan juga
  pas tombol "Cek Ulang" diklik - dua-duanya manggil fungsi yang sama,
  gak ada logic yang ditulis dobel.

## Kenapa vanilla JS (bukan React/framework)

Ini konsisten sama gaya `views/` yang pake HTML biasa (bukan template
engine) - jadi sisi client-nya juga vanilla JS, fetch ke API terus
manipulasi DOM manual. Kalo project makin kompleks dan butuh banyak
halaman/komponen interaktif, ini kandidat kuat buat di-upgrade ke
Vite + React (kayak folder `frontend/` di template lain).

## Cara nambah script baru

Bikin file baru di sini (misal `products.js`), terus include di HTML
yang butuh:
```html
<script src="/js/products.js"></script>
```
