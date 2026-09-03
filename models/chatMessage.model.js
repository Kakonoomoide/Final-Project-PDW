const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Riwayat chat konsultasi pertanian (M5). PRD bagian 4 ngebolehin nambah
 * tabel sendiri kalo fiturnya butuh - chat multi-turn butuh riwayat,
 * soalnya Gemini gak nyimpen konteks percakapan di sisi mereka. Tiap
 * giliran ngobrol disimpen 1 baris, terus pas user nanya lagi riwayatnya
 * dikirim ulang sebagai konteks (liat services/chat.service.js).
 *
 * Hasil deteksi foto ikut disimpen di tabel yang SAMA (bukan tabel
 * terpisah) biar chat & deteksi tampil dalam satu utas percakapan, dan
 * hasil diagnosis bisa ditanyain lanjut ("terus obatnya apa?"). Yang
 * nandain baris itu dari foto cuma kolom `hasImage`.
 */
const ChatMessage = sequelize.define(
  'ChatMessage',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false }, // FK -> users.id
    // 'user' = yang diketik user, 'model' = balasan Gemini.
    // Sengaja pake istilah Gemini biar pas dikirim balik jadi history
    // gak perlu dimapping lagi.
    role: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    // fotonya sendiri gak disimpen (bikin database bengkak), cuma
    // ditandain biar UI bisa kasih label "📷 Foto tanaman"
    hasImage: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'chat_messages', timestamps: true }
);

module.exports = ChatMessage;
