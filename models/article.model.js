const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Artikel / tips wisata yang ditulis admin. CRUD + AI caption jatah M2,
 * yang nampilin di landing page jatah M1. Tabel ini menggantikan `news`
 * dari tema lama.
 */
const Article = sequelize.define(
  'Article',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    caption: { type: DataTypes.STRING, allowNull: true }, // ringkasan pendek, bisa dibantu AI (M2)
    content: { type: DataTypes.TEXT, allowNull: false },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true }, // FK -> users.id (admin)
  },
  { tableName: 'articles', timestamps: true }
);

module.exports = Article;
