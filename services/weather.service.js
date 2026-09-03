const config = require('../config/env');

/**
 * Cuaca kota tujuan (M1). Pakai OpenWeatherMap "current weather" -
 * gratis di tier free, tinggal daftar API key di https://openweathermap.org/api
 * lalu isi WEATHER_API_KEY di .env (lihat .env.example).
 *
 * Ditulis dengan pola yang sama kayak services/geo.service.js: satu
 * pintu buat panggil API eksternal, timeout jelas, dan error mentah
 * diterjemahin jadi pesan yang bisa dibaca user - biar konsisten sama
 * gemini.service.js punya pesanRamah().
 */

const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const TIMEOUT_MS = 8000;

function isConfigured() {
  return Boolean(config.weatherApiKey) && !config.weatherApiKey.startsWith('isi-api-key');
}

/**
 * Ambil cuaca TERKINI untuk sebuah kota. `city` boleh "Bandung" atau
 * "Bandung,ID" (format OpenWeatherMap: "kota,kode_negara").
 */
async function getCurrentWeather(city) {
  if (!isConfigured()) {
    throw new Error('WEATHER_API_KEY belum diisi di file .env');
  }

  const url = `${BASE_URL}?q=${encodeURIComponent(city)}&units=metric&lang=id&appid=${config.weatherApiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Layanan cuaca lama merespons (timeout). Coba lagi.');
    }
    throw new Error('Gagal menghubungi layanan cuaca. Cek koneksi internet kamu.');
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 404) {
    throw new Error(`Kota "${city}" tidak ditemukan. Coba nama kota lain, misal "Bandung" atau "Bandung,ID".`);
  }
  if (response.status === 401) {
    throw new Error('WEATHER_API_KEY belum benar. Cek isian di file .env.');
  }
  if (!response.ok) {
    throw new Error('Layanan cuaca lagi bermasalah. Coba lagi sebentar lagi.');
  }

  const data = await response.json();

  return {
    city: data.name || city,
    country: data.sys?.country || '',
    condition: data.weather?.[0]?.main || '',
    description: data.weather?.[0]?.description || '',
    icon: data.weather?.[0]?.icon || '01d',
    temp: Math.round(data.main?.temp ?? 0),
    feelsLike: Math.round(data.main?.feels_like ?? 0),
    tempMin: Math.round(data.main?.temp_min ?? 0),
    tempMax: Math.round(data.main?.temp_max ?? 0),
    humidity: data.main?.humidity ?? null,
    windSpeed: data.wind?.speed ?? null,
    cloudiness: data.clouds?.all ?? null,
  };
}

module.exports = { getCurrentWeather, isConfigured };
