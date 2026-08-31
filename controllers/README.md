# controllers/

Jembatan antara HTTP request dan logic bisnis. Tugasnya: baca input dari
`req` (params/query/body), panggil fungsi yang sesuai di `services/`,
terus bungkus hasilnya jadi response lewat `utils/response.js`.

Controller **TIDAK** langsung query ke `models/` atau nulis logic bisnis
di sini - itu tanggung jawab `services/`. Controller harusnya tetep tipis.

## Isi folder ini

- **`health.controller.js`** - `getHealth(req, res)`, manggil
  `services/health.service.js` buat dapetin status, terus kirim balik
  lewat `sendResponse()`.

## Pola bikin controller baru

```js
const { getAllProducts } = require('../services/product.service');
const sendResponse = require('../utils/response');

async function getProducts(req, res) {
  try {
    const products = await getAllProducts();
    return sendResponse(res, { message: 'Berhasil ambil produk', data: products });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

module.exports = { getProducts };
```
