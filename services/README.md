# services/

Logic bisnis - query ke model, aturan, dipisah dari urusan HTTP.

- `auth.service.js` - registerUser(), loginUser()
- `gemini.service.js` - setup client Gemini yang dipake BARENG semua
  fitur AI (M1-M5). Udah dibikin sama M5. Isinya `generate()` (sekali
  jalan, bisa sekalian kirim gambar) & `chat()` (multi-turn), plus retry
  otomatis kalo Gemini lagi sibuk (503/429).
- `chat.service.js` - logic M5: chat konsultasi + deteksi hama/penyakit

Mahasiswa lain yang butuh Gemini: JANGAN bikin client baru, tinggal
tambah fungsi di `gemini.service.js` (misal `generateCaption()` buat M2,
`generateDescription()` buat M4) terus pake helper yang udah ada.
