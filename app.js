const express = require('express');
const path = require('path');
const session = require('express-session');

const config = require('./config/env');
const { sequelize } = require('./models');

const authRoutes = require('./routes/auth.routes');
const pageRoutes = require('./routes/page.routes');
const adminPageRoutes = require('./routes/admin.page.routes');
const chatRoutes = require('./routes/chat.routes'); // M5

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
  })
);

// M5 sengaja dimount SEBELUM express.json() global. Alasannya: fitur
// deteksi hama ngirim foto sebagai base64 di dalam body JSON, ukurannya
// bisa megabyte-an, sedangkan express.json() default cuma nerima 100kb
// dan bakal nolak duluan sebelum request-nya nyampe router chat. Router
// chat punya parser JSON sendiri dengan limit lebih gede (liat
// routes/chat.routes.js), jadi limit gede itu cuma berlaku di endpoint
// M5 - endpoint lain tetep aman di 100kb.
app.use('/api/chat', chatRoutes); // M5

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/admin', adminPageRoutes);
app.use('/', pageRoutes);

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Koneksi database SQLite berhasil');

    await sequelize.sync();
    console.log('Sync model selesai');

    app.listen(config.port, () => {
      console.log(`Server jalan di http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('Gagal konek ke database:', err.message);
  }
}

start();
