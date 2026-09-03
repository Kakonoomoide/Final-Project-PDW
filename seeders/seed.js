require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, User, Destination, Article } = require('../models');

const SALT_ROUNDS = 10;

/**
 * Data destinasi awal. Koordinatnya diisi manual (bukan hasil geocoding)
 * biar seeding gak butuh internet dan gak kena antrian Nominatim.
 * Dipakai M3 buat halaman browse & M1 buat landing page, jadi mereka
 * bisa mulai kerja tanpa nunggu M4 kelar bikin CRUD-nya.
 */
const destinasiDummy = [
  {
    name: 'Pantai Kuta',
    category: 'pantai',
    city: 'Badung',
    province: 'Bali',
    ticketPrice: 0,
    lat: -8.7184,
    lng: 115.1686,
    description: 'Pantai berpasir putih dengan ombak yang ramah buat pemula belajar selancar.',
  },
  {
    name: 'Candi Borobudur',
    category: 'budaya',
    city: 'Magelang',
    province: 'Jawa Tengah',
    ticketPrice: 50000,
    lat: -7.6079,
    lng: 110.2038,
    description: 'Candi Buddha terbesar di dunia, paling cantik dilihat saat matahari terbit.',
  },
  {
    name: 'Gunung Bromo',
    category: 'gunung',
    city: 'Probolinggo',
    province: 'Jawa Timur',
    ticketPrice: 34000,
    lat: -7.9425,
    lng: 112.953,
    description: 'Kaldera berpasir dengan panorama matahari terbit dari Bukit Penanjakan.',
  },
  {
    name: 'Malioboro',
    category: 'kuliner',
    city: 'Yogyakarta',
    province: 'DI Yogyakarta',
    ticketPrice: 0,
    lat: -7.7926,
    lng: 110.3656,
    description: 'Jalan legendaris buat wisata belanja dan kuliner angkringan malam hari.',
  },
  {
    name: 'Kawah Putih',
    category: 'taman',
    city: 'Bandung',
    province: 'Jawa Barat',
    ticketPrice: 35000,
    lat: -7.166,
    lng: 107.402,
    description: 'Danau kawah belerang dengan air kehijauan di ketinggian 2.400 mdpl.',
  },
  {
    name: 'Raja Ampat',
    category: 'pantai',
    city: 'Waisai',
    province: 'Papua Barat Daya',
    ticketPrice: 1000000,
    lat: -0.5897,
    lng: 130.1,
    description: 'Gugusan karst di atas laut dengan terumbu karang terkaya di dunia.',
  },
];

const artikelDummy = [
  {
    title: 'Cara Menyusun Itinerary yang Tidak Bikin Capek',
    caption: 'Tiga aktivitas sehari sudah cukup. Sisanya biarkan spontan.',
    content:
      'Kesalahan paling umum saat menyusun rencana perjalanan adalah menjejalkan terlalu banyak tempat dalam satu hari. ' +
      'Di atas kertas jadwalnya terlihat produktif, tapi di lapangan waktu tempuh antar tempat hampir selalu lebih lama ' +
      'daripada perkiraan. Mulailah dari tiga aktivitas utama per hari, lalu sisakan ruang kosong di sore hari.',
  },
  {
    title: 'Menghitung Budget Liburan Tanpa Kaget di Akhir',
    caption: 'Pisahkan biaya tetap dan biaya harian sejak awal.',
    content:
      'Biaya tetap adalah tiket pesawat dan penginapan - jumlahnya sudah pasti sebelum berangkat. ' +
      'Biaya harian adalah makan, transport lokal, dan tiket masuk. Dengan memisahkan keduanya, kamu bisa tahu ' +
      'persis berapa sisa uang yang boleh dipakai per hari, bukan menebak-nebak sampai hari terakhir.',
  },
  {
    title: 'Musim Terbaik Berkunjung ke Indonesia Timur',
    caption: 'April sampai Oktober, saat laut sedang tenang.',
    content:
      'Indonesia Timur punya pola musim yang berbeda dengan Jawa. Untuk menyelam di Raja Ampat atau Labuan Bajo, ' +
      'jendela terbaiknya April sampai Oktober ketika gelombang lebih rendah dan jarak pandang di dalam air lebih jauh. ' +
      'Di luar itu, penyeberangan antar pulau sering dibatalkan karena cuaca.',
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Koneksi database berhasil');
    await sequelize.sync();

    const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
    const [admin] = await User.findOrCreate({
      where: { email: 'admin@travelit.com' },
      defaults: { name: 'Admin TrAvelIt', password: hashedPassword, role: 'admin' },
    });

    console.log('Admin siap:', admin.email);
    console.log('Login admin: email=admin@travelit.com password=admin123');

    // findOrCreate biar seeder aman dijalanin berkali-kali - gak bikin
    // duplikat kalau datanya udah ada.
    for (const d of destinasiDummy) {
      await Destination.findOrCreate({
        where: { name: d.name },
        defaults: { ...d, createdBy: admin.id },
      });
    }
    console.log(`Destinasi dummy siap: ${destinasiDummy.length} baris`);

    for (const a of artikelDummy) {
      await Article.findOrCreate({
        where: { title: a.title },
        defaults: { ...a, createdBy: admin.id },
      });
    }
    console.log(`Artikel dummy siap: ${artikelDummy.length} baris`);

    console.log('\nSeeding selesai ✅');
    process.exit(0);
  } catch (err) {
    console.error('Gagal seeding:', err.message);
    process.exit(1);
  }
}

seed();
