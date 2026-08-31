# services/

Logic bisnis aplikasi - query ke model, aturan/validasi, dan hal-hal
yang "ngapain" aplikasi ini, dipisah dari urusan HTTP (request/response).

## Kenapa dipisah dari controllers/

`controllers/` cuma jembatan antara HTTP request dan logic bisnis -
harusnya tipis, tinggal manggil fungsi di `services/` dan bungkus
hasilnya jadi response. Kalo logic-nya ditulis langsung di controller,
susah dipake ulang (misal dipake juga dari command line script atau
bot) dan susah dites terpisah dari Express.

## Isi folder ini

- **`health.service.js`** - `getHealthStatus()`, isinya logic nentuin
  status aplikasi. Sekarang masih sederhana, tapi kalo nanti perlu
  ngecek hal lain (koneksi database, dst), cukup ubah di sini,
  `controllers/health.controller.js` gak perlu disentuh.

## Pola penamaan

Satu file per "domain"/fitur: `product.service.js`, `order.service.js`,
dst. Isinya fungsi-fungsi yang query ke `models/` dan/atau ngejalanin
aturan bisnis.
