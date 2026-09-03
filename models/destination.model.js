const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Katalog destinasi wisata yang dikurasi admin. CRUD-nya jatah M4,
 * halaman browse-nya jatah M3. Tabel ini menggantikan `products` dari
 * tema lama.
 *
 * `lat`/`lng` ada di sini supaya destinasi bisa langsung diplot di peta
 * Leaflet tanpa perlu geocoding ulang tiap halaman dibuka - geocoding
 * itu kena antrian 1 request/detik (liat services/geo.service.js), jadi
 * nge-geocode 20 destinasi tiap kali halaman dibuka bakal makan 20 detik.
 */
const Destination = sequelize.define(
  'Destination',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    province: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true }, // manual atau dibantu AI (M4)
    ticketPrice: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lat: { type: DataTypes.FLOAT, allowNull: true },
    lng: { type: DataTypes.FLOAT, allowNull: true },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true }, // FK -> users.id (admin)
  },
  { tableName: 'destinations', timestamps: true }
);

Destination.CATEGORIES = ['pantai', 'gunung', 'budaya', 'kuliner', 'taman', 'lainnya'];

module.exports = Destination;
