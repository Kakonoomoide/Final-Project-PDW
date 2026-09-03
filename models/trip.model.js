const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Satu baris = satu rencana perjalanan punya user (M5).
 *
 * Isinya cuma PERMINTAAN-nya (mau ke mana, kapan, budget berapa) - hasil
 * itinerary dari AI disimpen terpisah di tabel `itineraries`, soalnya
 * satu trip bisa punya beberapa versi itinerary (tiap kali di-regenerate
 * bikin versi baru, bukan nimpa yang lama).
 *
 * `durationDays` sebenernya bisa dihitung dari startDate-endDate, tapi
 * sengaja disimpen juga: biar gak perlu ngitung tanggal tiap kali mau
 * nampilin daftar trip, dan biar validator gampang ngecek "jumlah hari
 * dari AI cocok gak sama durasi yang diminta".
 */
const Trip = sequelize.define(
  'Trip',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false }, // FK -> users.id
    title: { type: DataTypes.STRING, allowNull: false },
    destination: { type: DataTypes.STRING, allowNull: false },
    originCity: { type: DataTypes.STRING, allowNull: true }, // boleh diisi dari geolocation
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    durationDays: { type: DataTypes.INTEGER, allowNull: false },
    budget: { type: DataTypes.INTEGER, allowNull: false }, // rupiah, total semua orang
    travelerCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    // 'draft'     = baru dibuat, itinerary belum ada
    // 'generated' = punya minimal 1 versi itinerary
    // 'failed'    = AI gagal atau hasilnya gak lolos validasi
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'draft' },
    // pesan error terakhir kalau status 'failed'. Trip yang gagal sengaja
    // TETEP disimpen (gak dihapus) biar user bisa mencet "coba lagi"
    // tanpa ngisi ulang formnya dari nol.
    lastError: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: 'trips', timestamps: true }
);

Trip.STATUS = { DRAFT: 'draft', GENERATED: 'generated', FAILED: 'failed' };

module.exports = Trip;
