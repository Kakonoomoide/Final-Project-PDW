require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  appName: process.env.APP_NAME || 'TrAvelIt',
  sessionSecret: process.env.SESSION_SECRET || 'secret-default-ganti-ini',
  dbStorage: process.env.DB_STORAGE || './database.sqlite',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
  weatherApiKey: process.env.WEATHER_API_KEY,

  // Nominatim (OpenStreetMap) dipake buat verifikasi lokasi tempat di
  // itinerary & reverse geocode tombol "pakai lokasi saya". Gratis, gak
  // butuh API key, TAPI ada syarat pemakaian yang wajib dipatuhi:
  // maksimal 1 request/detik + kirim User-Agent yang jelas. Kalau
  // dilanggar, IP-nya diblokir. Penegakannya ada di
  // services/geo.service.js - jangan panggil Nominatim dari tempat lain.
  nominatimBaseUrl: process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org',
  nominatimUserAgent: process.env.NOMINATIM_USER_AGENT || 'TrAvelIt/1.0 (final project PDW)',
};

module.exports = config;
