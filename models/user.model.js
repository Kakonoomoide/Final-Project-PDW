const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * SATU tabel buat admin & user biasa, dibedain lewat kolom `role`.
 * Kenapa gak dipisah 2 tabel: karena logic login-nya sama persis
 * (cek email+password), cuma redirect/akses fiturnya yang beda
 * berdasarkan role. Lebih simpel dibanding maintain 2 tabel + 2 flow
 * auth terpisah.
 */
const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }, // hash, bukan plain text
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'user', // 'user' | 'admin'
    },
  },
  { tableName: 'users', timestamps: true }
);

module.exports = User;
