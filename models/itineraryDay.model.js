const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Satu hari dalam satu versi itinerary (M5).
 *
 * `date` diisi dari startDate trip + (dayNumber - 1) hari, dihitung di
 * server - BUKAN dari AI. Model bahasa gampang keliru ngitung tanggal
 * (apalagi kalau nyeberang bulan), sedangkan penjumlahan hari itu urusan
 * sepele yang gak ada alasan buat diserahin ke AI.
 */
const ItineraryDay = sequelize.define(
  'ItineraryDay',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    itineraryId: { type: DataTypes.INTEGER, allowNull: false },
    dayNumber: { type: DataTypes.INTEGER, allowNull: false }, // 1..n
    date: { type: DataTypes.DATEONLY, allowNull: true },
    summary: { type: DataTypes.STRING, allowNull: true }, // judul singkat hari itu
  },
  { tableName: 'itinerary_days', timestamps: true }
);

module.exports = ItineraryDay;
