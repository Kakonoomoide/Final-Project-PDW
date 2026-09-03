const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Satu aktivitas dalam satu hari (M5): kunjungan tempat, makan, pindah
 * kota, check-in penginapan.
 *
 * Soal `placeVerified` - ini inti pengamanan fitur:
 * koordinat dari AI gak selalu bener. Model bahasa bisa ngarang tempat
 * yang gak ada ("halusinasi") dengan nada sangat percaya diri. Makanya
 * tiap tempat dicek ulang ke Nominatim (OpenStreetMap):
 *   - ketemu       -> koordinat dari Nominatim, placeVerified = true
 *   - gak ketemu   -> koordinat tebakan AI tetep dipake, tapi ditandai
 *                     placeVerified = false, dan UI ngasih lencana
 *                     peringatan biar user tau ini perlu dicek sendiri
 *   - dua-duanya gagal -> lat/lng null, aktivitasnya tetep tampil di
 *                     daftar tapi gak diplot di peta
 * Jadi tempat meragukan gak disembunyiin, tapi juga gak disajiin
 * seolah-olah udah pasti.
 *
 * `distanceKmFromPrev` & `travelMinutesFromPrev` dihitung di SERVER dari
 * koordinat aktivitas sebelumnya (rumus haversine), bukan diminta ke AI
 * - angka jarak dari AI gampang ngaco, sedangkan haversine itu pasti.
 * Catatan: ini jarak garis lurus, bukan jarak jalan. Ditampilin ke user
 * dengan kata "sekitar" biar gak dikira presisi.
 */
const Activity = sequelize.define(
  'Activity',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    itineraryDayId: { type: DataTypes.INTEGER, allowNull: false },
    orderNo: { type: DataTypes.INTEGER, allowNull: false }, // urutan dalam satu hari
    startTime: { type: DataTypes.STRING, allowNull: true }, // "09:00"
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false, defaultValue: 'lainnya' },
    description: { type: DataTypes.TEXT, allowNull: true },
    estimatedCost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lat: { type: DataTypes.FLOAT, allowNull: true },
    lng: { type: DataTypes.FLOAT, allowNull: true },
    placeVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    distanceKmFromPrev: { type: DataTypes.FLOAT, allowNull: true },
    travelMinutesFromPrev: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'activities', timestamps: true }
);

Activity.CATEGORIES = ['wisata', 'kuliner', 'transport', 'penginapan', 'lainnya'];

module.exports = Activity;
