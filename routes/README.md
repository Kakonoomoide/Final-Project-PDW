# routes/

Definisi endpoint - path URL mana yang manggil controller mana. File di
sini gak ada logic apapun, cuma "peta" `path -> controller function`.

Ada 2 jenis route di project ini:
- **API routes** (`health.routes.js`) - dipasang di `app.js` dengan
  prefix `/api/...`, balikin JSON. Dipanggil dari `public/js/*.js` pake
  `fetch()`.
- **Page routes** (`page.routes.js`) - dipasang tanpa prefix, balikin
  file HTML dari `views/` (`res.sendFile(...)`).

## Isi folder ini

- **`health.routes.js`** - `GET /` (dipasang jadi `/api/health` di
  `app.js`) → `controllers/health.controller.js`
- **`page.routes.js`** - `GET /` (halaman utama) → serve `views/index.html`

## Cara nambah route baru

Bikin `<nama>.routes.js`, import controller yang sesuai, daftarin
method + path-nya, terus mount di `app.js`:
```js
// routes/product.routes.js
const router = require('express').Router();
const { getProducts } = require('../controllers/product.controller');
router.get('/', getProducts);
module.exports = router;

// app.js
app.use('/api/products', require('./routes/product.routes'));
```
