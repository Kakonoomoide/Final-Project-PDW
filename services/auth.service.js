const bcrypt = require('bcrypt');
const { User } = require('../models');

const SALT_ROUNDS = 10;

/**
 * Register SELALU jadi role 'user' - sengaja gak ada opsi daftar
 * jadi admin dari form publik (prinsip keamanan: akun privileged
 * gak boleh bisa didaftarin sembarangan). Akun admin dibikin lewat
 * seeder aja (liat seeders/seed.js).
 */
async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return { success: false, message: 'Email udah kepake' };
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, password: hashedPassword, role: 'user' });

  return { success: true, user };
}

/**
 * Satu fungsi login dipake buat admin MAUPUN user biasa - bedanya
 * cuma di value `role` yang kesimpen di tabel users, gak ada logic
 * cabang terpisah.
 */
async function loginUser({ email, password }) {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return { success: false, message: 'Email atau password salah' };
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return { success: false, message: 'Email atau password salah' };
  }

  return { success: true, user };
}

module.exports = { registerUser, loginUser };
