# controllers/

Jembatan HTTP request <-> logic bisnis. Tipis, tinggal panggil `services/`
dan bungkus hasilnya lewat `utils/response.js`.

- `auth.controller.js` - register, login, logout, me
- `page.controller.js` - serve semua file HTML dari `views/`
- `chat.controller.js` - chat AI & deteksi hama/penyakit (M5)
