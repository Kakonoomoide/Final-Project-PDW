require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  storeName: process.env.STORE_NAME || 'Tani Makmur',
  sessionSecret: process.env.SESSION_SECRET || 'secret-default-ganti-ini',
  dbStorage: process.env.DB_STORAGE || './database.sqlite',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
  weatherApiKey: process.env.WEATHER_API_KEY,
};

module.exports = config;
