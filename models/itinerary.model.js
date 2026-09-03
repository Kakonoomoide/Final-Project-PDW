const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Satu baris = SATU VERSI itinerary utuh hasil generate AI (M5).
 *
 * Aturan paling penting di fitur ini: regenerate BIKIN VERSI BARU, bukan
 * nimpa yang lama. Jadi user bisa bandingin hasil lama vs baru, dan
 * riwayatnya gak ilang gara-gara sekali klik. Versi yang ditampilin di
 * halaman detail = `version` paling gede buat trip itu.
 *
 * `modelUsed` & `generatedAt` disimpen karena estimasi biaya dari AI itu
 * bisa berubah seiring waktu. Dengan nyimpen kapan dan pake model apa,
 * angkanya bisa dijelasin sebagai "estimasi per tanggal sekian", bukan
 * seolah-olah harga yang berlaku selamanya.
 */
const Itinerary = sequelize.define(
  'Itinerary',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tripId: { type: DataTypes.INTEGER, allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    totalEstimatedCost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'IDR' },
    modelUsed: { type: DataTypes.STRING, allowNull: true },
    generatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'itineraries',
    timestamps: true,
    indexes: [{ fields: ['tripId', 'version'] }],
  }
);

module.exports = Itinerary;
