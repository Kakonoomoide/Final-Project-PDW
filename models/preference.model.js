const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Preferensi perjalanan, 1 baris per trip (M5).
 *
 * Dipisah dari tabel `trips` (bukan digabung jadi kolom tambahan)
 * ngikutin rancangan di PRD: identitas trip (tujuan, tanggal) itu fakta
 * yang jarang berubah, sedangkan preferensi ini yang sering diutak-atik
 * pas user pengen hasil beda terus nge-regenerate.
 *
 * `interests` disimpen sebagai JSON string karena SQLite gak punya tipe
 * array. Jangan dibaca langsung - pake getter `interestList` di bawah,
 * biar yang manggil gak perlu tau soal JSON.parse dan gak perlu
 * nulis try/catch sendiri-sendiri.
 */
const Preference = sequelize.define(
  'Preference',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tripId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    interests: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
    // seberapa padat jadwalnya: santai (2-3 aktivitas/hari),
    // sedang (4), padat (5-6)
    pace: { type: DataTypes.STRING, allowNull: false, defaultValue: 'sedang' },
    specialNeeds: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'preferences',
    timestamps: true,
    getterMethods: {
      interestList() {
        try {
          const parsed = JSON.parse(this.getDataValue('interests') || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          // Data rusak gak boleh bikin halaman trip ikut error - lebih
          // baik minat tampil kosong daripada seluruh detail gagal load.
          return [];
        }
      },
    },
  }
);

Preference.PACE = ['santai', 'sedang', 'padat'];

module.exports = Preference;
