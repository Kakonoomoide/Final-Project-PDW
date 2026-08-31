# models/

Definisi tabel database pake Sequelize. Satu file = satu tabel.

## Isi folder ini (saat ini)

- **`index.js`** - export instance `sequelize` (dari `config/database.js`).
  Belum ada model apapun di template ini, tinggal ditambah pas butuh.

## Cara nambah model baru

Bikin file `<nama>.model.js`, contoh `product.model.js`:
```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define(
  'Product',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.INTEGER, allowNull: false },
  },
  { tableName: 'products', timestamps: true }
);

module.exports = Product;
```

Terus daftarin di `models/index.js`:
```js
const sequelize = require('../config/database');
const Product = require('./product.model');

module.exports = { sequelize, Product };
```

`sequelize.sync()` (dipanggil di `app.js` pas server nyala) otomatis
bikin tabelnya kalo belum ada - gak perlu bikin manual kayak SQL biasa.
