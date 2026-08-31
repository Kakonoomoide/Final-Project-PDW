# utils/

Fungsi bantu murni (pure functions) yang dipake berulang di banyak
tempat - gak nyangkut logic bisnis spesifik satu fitur doang.

## Isi folder ini

- **`response.js`** - `sendResponse(res, { code, success, message, data })`,
  dipake di SEMUA controller biar bentuk response API-nya konsisten di
  endpoint manapun. Jangan pake `res.json()` langsung di controller,
  selalu lewat helper ini.

## Kapan taruh fungsi di sini

Kalo fungsinya gak butuh `req`/`res` Express secara langsung (atau cuma
butuh `res` buat ngirim response kayak `sendResponse`), dan dipake lebih
dari 1 controller/service - taruh di sini. Kalo logic-nya spesifik ke
satu fitur/tabel doang, lebih cocok di `services/`.
