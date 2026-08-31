# views/

Halaman-halaman HTML biasa (bukan template engine kayak EJS) - dikirim
apa adanya lewat `res.sendFile()` di `routes/page.routes.js`. Bagian
yang dinamis ditangani di sisi CLIENT lewat script di `public/js/`,
bukan di-generate server (beda sama EJS yang nge-render HTML di server
sebelum dikirim).

## Isi folder ini

- **`index.html`** - halaman utama, pake Bootstrap (CDN) buat styling.
  Ada elemen `#health-badge` dan `#health-output` yang diisi/di-update
  sama `public/js/main.js` pas halaman dibuka.

## Cara kerja halaman ini

1. Browser minta `GET /`
2. `routes/page.routes.js` balikin file `index.html` ini APA ADANYA
3. Browser render HTML-nya, load `public/js/main.js`
4. `main.js` fetch ke `/api/health`, terus isi `#health-badge` &
   `#health-output` pake JavaScript biasa (`document.getElementById`)

## Cara nambah halaman baru

1. Bikin file HTML baru di sini (misal `about.html`)
2. Tambahin route di `routes/page.routes.js`:
   ```js
   router.get('/about', (req, res) => {
     res.sendFile(path.join(__dirname, '../views/about.html'));
   });
   ```
3. Kalo halaman itu butuh JS interaktif, bikin file baru juga di
   `public/js/` dan include lewat `<script src="/js/....js">`
