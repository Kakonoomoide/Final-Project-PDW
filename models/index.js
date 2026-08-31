const sequelize = require('../config/database');

/**
 * Belum ada model apapun di template ini - baru `sequelize` instance
 * doang yang di-export, siap dipake pas nambah model pertama.
 *
 * Kalo nambah model baru (misal Product), polanya:
 * 1. Bikin models/product.model.js (define kolom-kolomnya)
 * 2. Import & tambahin di sini: const Product = require('./product.model')
 * 3. Export juga: module.exports = { sequelize, Product }
 */
module.exports = { sequelize };
