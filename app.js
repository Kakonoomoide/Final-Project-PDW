const express = require('express');
const path = require('path');

const config = require('./config/env');
const { sequelize } = require('./models');

const healthRoutes = require('./routes/health.routes');
const pageRoutes = require('./routes/page.routes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/health', healthRoutes);
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
