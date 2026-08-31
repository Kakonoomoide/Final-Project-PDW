require('dotenv').config();
const { sequelize } = require('../models');

/**
 * Belum ada model apapun di template ini, jadi seeder ini belum
 * nge-insert data apa-apa. Ini contoh KERANGKA yang bisa langsung
 * dipake pas udah nambah model pertama - liat README di folder ini
 * buat contoh lengkapnya.
 */
async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Koneksi database berhasil');
    await sequelize.sync();

    // TODO: ganti bagian ini pas udah ada model, contoh:
    // const { Product } = require('../models');
    // const count = await Product.count();
    // if (count === 0) {
    //   await Product.bulkCreate([...]);
    //   console.log('Data dummy berhasil ditambahin');
    // } else {
    //   console.log('Data udah ada, skip supaya gak dobel');
    // }

    console.log('Belum ada model buat di-seed. Cek README di folder seeders/ buat contohnya.');
    process.exit(0);
  } catch (err) {
    console.error('Gagal seeding:', err.message);
    process.exit(1);
  }
}

seed();
