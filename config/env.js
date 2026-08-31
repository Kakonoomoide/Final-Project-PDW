require('dotenv').config();

/**
 * Semua env variable dibaca SEKALI di sini, bukan process.env tersebar
 * di banyak file. Kalo nambah env variable baru, tambahin di sini.
 */
const config = {
  port: process.env.PORT || 3000,
  dbStorage: process.env.DB_STORAGE || './database.sqlite',
};

module.exports = config;
