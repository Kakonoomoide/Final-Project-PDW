# seeders/

Script buat ngisi database dengan data awal/dummy, dijalanin manual
lewat `npm run seed` - bukan otomatis jalan pas server nyala.

## Isi folder ini (saat ini)

- **`seed.js`** - kerangka dasar (belum nge-insert apapun, karena belum
  ada model). Tinggal diisi pas udah nambah model pertama.

## Cara pake pas udah ada model

Contoh isi `seed.js` kalo udah ada model `Product`:
```js
require('dotenv').config();
const { sequelize, Product } = require('../models');

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync();

  const count = await Product.count();
  if (count === 0) {
    await Product.bulkCreate([
      { name: 'Produk A', price: 50000 },
      { name: 'Produk B', price: 75000 },
    ]);
    console.log('Data dummy berhasil ditambahin');
  } else {
    console.log('Data udah ada, skip supaya gak dobel');
  }

  process.exit(0);
}

seed();
```

Jalanin dengan:
```bash
npm run seed
```

## Kenapa dicek `count === 0` dulu

Biar aman dijalanin berkali-kali - kalo data udah ada, seeder skip aja,
gak nambahin data duplikat tiap kali `npm run seed` dipanggil ulang.
