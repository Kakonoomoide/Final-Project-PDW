require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, User, Product } = require('../models');

const SALT_ROUNDS = 10;

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Koneksi database berhasil');
    await sequelize.sync();

    const hashedPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
    const [admin] = await User.findOrCreate({
      where: { email: 'admin@tanimakmur.com' },
      defaults: { name: 'Admin Tani', password: hashedPassword, role: 'admin' },
    });

    console.log('Admin siap:', admin.email);

    // Seed contoh bahan pertanian awal jika masih kosong
    const productCount = await Product.count();
    if (productCount === 0) {
      await Product.bulkCreate([
        {
          name: 'Benih Padi Inpari 32 HDB Unggul (5kg)',
          category: 'bibit',
          description:
            'Benih padi varietas Inpari 32 HDB bersertifikat resmi. Tahan terhadap serangan penyakit hawar daun bakteri (HDB) dan blas. Potensi hasil mencapai 8,4 ton/ha gabah kering giling. Cocok untuk sawah irigasi dataran rendah hingga sedang.',
          price: 75000,
          stock: 45,
          imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60',
          createdBy: admin.id,
        },
        {
          name: 'Pupuk NPK Mutiara 16-16-16 (1kg)',
          category: 'pupuk',
          description:
            'Pupuk NPK majemuk granular berkualitas tinggi dengan kandungan hara seimbang Nitrogen (16%), Fosfat (16%), dan Kalium (16%). Cepat larut dalam air dan mudah diserap oleh tanaman untuk mempercepat pertumbuhan vegetatif dan generatif.',
          price: 22000,
          stock: 120,
          imageUrl: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=500&auto=format&fit=crop&q=60',
          createdBy: admin.id,
        },
        {
          name: 'Sprayer Elektrik Pertanian Swan 16 Liter',
          category: 'alat',
          description:
            'Alat semprot hama elektrik kapasitas 16 Liter dengan baterai rechargeable 12V 8Ah. Tekanan semprot stabil dan hemat tenaga kerja. Dilengkapi berbagai macam nozzle untuk kebutuhan penyemprotan pupuk cair dan pestisida.',
          price: 480000,
          stock: 18,
          imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22509?w=500&auto=format&fit=crop&q=60',
          createdBy: admin.id,
        },
        {
          name: 'Insektisida Regent 50 SC (100ml)',
          category: 'pestisida',
          description:
            'Insektisida sistemik racun kontak dan lambung berbentuk pekatan suspensi warna putih. Efektif mengendalikan hama wereng coklat, penggerek batang padi, dan thrips pada tanaman cabai dan sayuran.',
          price: 45000,
          stock: 60,
          imageUrl: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=500&auto=format&fit=crop&q=60',
          createdBy: admin.id,
        },
        {
          name: 'Pupuk Organik Cair Hayati EM4 Pertanian (1L)',
          category: 'pupuk',
          description:
            'Kultur mikroorganisme menguntungkan untuk meningkatkan kesuburan tanah dan mempercepat fermentasi pupuk kompos/kandang. Memperbaiki sifat fisik, kimia, dan biologi tanah secara ramah lingkungan.',
          price: 28000,
          stock: 85,
          imageUrl: 'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?w=500&auto=format&fit=crop&q=60',
          createdBy: admin.id,
        },
      ]);
      console.log('Seeding contoh bahan pertanian berhasil (5 produk)');
    }

    console.log('Login admin: email=admin@tanimakmur.com password=admin123');
    console.log('\nSeeding selesai ✅');
    process.exit(0);
  } catch (err) {
    console.error('Gagal seeding:', err.message);
    process.exit(1);
  }
}

seed();
