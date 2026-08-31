const express = require('express');
const path = require('path');
const session = require('express-session');

const config = require('./config/env');
const { sequelize } = require('./models');

const authRoutes = require('./routes/auth.routes');
const pageRoutes = require('./routes/page.routes');
const adminPageRoutes = require('./routes/admin.page.routes');

const newsRoutes = require('./routes/news.routes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
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
