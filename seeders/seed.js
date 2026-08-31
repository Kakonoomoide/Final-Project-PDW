require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, User } = require('../models');

const SALT_ROUNDS = 10;

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Koneksi database berhasil');
    await sequelize.sync();

    const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
    const [admin] = await User.findOrCreate({
      where: { email: 'admin@tanimakmur.com' },
      defaults: { name: 'Admin', password: hashedPassword, role: 'admin' },
    });

    console.log('Admin siap:', admin.email);
    console.log('Login admin: email=admin@tanimakmur.com password=admin123');
    console.log('\nSeeding selesai ✅');
    process.exit(0);
  } catch (err) {
    console.error('Gagal seeding:', err.message);
    process.exit(1);
  }
}

seed();
