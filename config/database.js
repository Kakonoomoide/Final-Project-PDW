const { Sequelize } = require('sequelize');
const config = require('./env');

/**
 * SQLite gak butuh server database terpisah kayak Postgres/MySQL -
 * datanya kesimpen di 1 file (`database.sqlite`), otomatis kebuat
 * sendiri pas pertama kali app.js manggil sequelize.sync(). Cocok
 * banget buat development/tugas kuliah karena zero-setup.
 */
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.dbStorage,
  logging: false,
});

module.exports = sequelize;
