const express = require('express');
const path = require('path');
const session = require('express-session');

const config = require('./config/env');
const { sequelize } = require('./models');

const authRoutes = require('./routes/auth.routes');
const pageRoutes = require('./routes/page.routes');
const adminPageRoutes = require('./routes/admin.page.routes');
const adminRoutes = require('./routes/admin.routes');
const articleRoutes = require('./routes/article.routes'); // M2
const browseDestinationRoutes = require('./routes/browse-destination.routes'); // M3
const destinationRoutes = require('./routes/destination.routes'); // M4
const chatRoutes = require('./routes/chat.routes'); // M5
const tripRoutes = require('./routes/trip.routes'); // M5
const geoRoutes = require('./routes/geo.routes'); // M5
const weatherRoutes = require('./routes/weather.routes'); // M1

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

// Router chat sengaja dimount SEBELUM express.json() global. Alasannya:
// fitur identifikasi tempat ngirim foto sebagai base64 di dalam body
// JSON, ukurannya bisa megabyte-an, sedangkan express.json() default
// cuma nerima 100kb dan bakal nolak duluan sebelum request-nya nyampe
// router chat. Router chat punya parser JSON sendiri dengan limit lebih
// gede (liat routes/chat.routes.js), jadi limit gede itu cuma berlaku di
// endpoint chat - endpoint lain tetep aman di 100kb.
app.use('/api/chat', chatRoutes); // M5

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes); // M2
app.use('/api/ai', browseDestinationRoutes); // M3 -> /api/ai/destination-finder
app.use('/api/destinations', destinationRoutes); // M4
app.use('/api/trips', tripRoutes); // M5
app.use('/api/geo', geoRoutes); // M5
app.use('/api/weather', weatherRoutes); // M1
app.use('/api/admin', adminRoutes);
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
