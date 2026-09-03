const { GoogleGenAI } = require('@google/genai');
const config = require('./../config/env');

/**
 * Setup client Gemini yang dipake BARENG-BARENG semua fitur AI (M1-M5).
 * Sesuai catatan di README utama: jangan tiap mahasiswa bikin koneksi
 * Gemini sendiri-sendiri, cukup import dari sini (DRY). Dibuat pertama
 * kali sama M5 karena kebetulan butuh duluan.
 *
 * Mahasiswa lain tinggal nambah fungsi baru di file ini, misal:
 *   - generateCaption()        -> M2 (caption artikel wisata)
 *   - generateDescription()    -> M4 (deskripsi destinasi)
 *   - recommendDestinations()  -> M3 (hasil quiz destination finder)
 *   - narasiWaktuBerkunjung()  -> M1 (gabungan data cuaca + narasi AI)
 * dan pake helper `generate()` / `generateJson()` / `callWithRetry()` di
 * bawah biar gak nulis ulang urusan API key + retry.
 */

// Client-nya di-cache (dibikin sekali pas pertama dipake), bukan bikin
// baru tiap request - nyambungin ulang tiap kali cuma buang-buang waktu.
let client = null;

function getClient() {
  if (!config.geminiApiKey || config.geminiApiKey.startsWith('isi-api-key')) {
    throw new Error('GEMINI_API_KEY belum diisi di file .env');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return client;
}

/**
 * Terjemahin error mentah dari API Gemini jadi kalimat yang berguna.
 *
 * Error asli dari Gemini itu bentuknya JSON gede, contohnya:
 *   {"error":{"code":429,"message":"You exceeded your current quota...
 * Kalau itu dilempar apa adanya ke user, yang muncul di layar adalah
 * dinding teks teknis yang gak ngasih tau dia harus ngapain.
 *
 * Ditaruh di sini (bukan di tiap service) supaya SEMUA fitur AI kebagian
 * - caption M2, quiz M3, deskripsi M4, itinerary & chat M5. Pesan
 * aslinya tetep masuk console buat yang ngoding.
 */
function pesanRamah(errorMentah) {
  const teks = String(errorMentah || '');

  if (/429|quota|rate limit|RESOURCE_EXHAUSTED/i.test(teks)) {
    return 'Kuota AI lagi habis. Coba lagi beberapa saat lagi ya.';
  }
  if (/503|overload|high demand|unavailable/i.test(teks)) {
    return 'Server AI lagi ramai. Coba lagi beberapa menit lagi ya.';
  }
  if (/API[_ ]?KEY|api key|401|403|PERMISSION_DENIED/i.test(teks)) {
    return 'API key Gemini belum benar. Cek GEMINI_API_KEY di file .env.';
  }
  if (/timeout|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|fetch failed|network/i.test(teks)) {
    return 'Gagal menghubungi server AI. Cek koneksi internet kamu.';
  }

  return teks || 'Gagal memanggil AI';
}

/**
 * Bungkus error mentah jadi Error dengan pesan yang bisa dibaca user.
 * Yang aslinya disimpen di `.cause` biar gak ilang buat debugging.
 */
function errorRamah(err) {
  console.error('[gemini]', err.message);
  const baru = new Error(pesanRamah(err.message));
  baru.cause = err;
  return baru;
}

/**
 * Gemini kadang balikin 503 (lagi rame) atau 429 (kena limit) padahal
 * requestnya bener. Kalo langsung dilempar ke user, chat-nya keliatan
 * error mulu padahal cuma perlu diulang. Jadi dicoba ulang beberapa kali
 * dulu dengan jeda yang makin lama, baru nyerah.
 */
async function callWithRetry(fn, maxAttempt = 3) {
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempt; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      const isSibuk = /503|429|overload|high demand|unavailable/i.test(err.message || '');
      // error selain "lagi sibuk" (misal API key salah) percuma diulang
      if (!isSibuk || attempt === maxAttempt) break;

      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastErr;
}

/**
 * Pemanggilan Gemini paling dasar: kirim `contents`, dapet teks balasan.
 * Dipake fitur yang SEKALI JALAN (gak butuh riwayat) - contoh:
 * identifikasi tempat dari foto (M5), caption artikel (M2),
 * deskripsi destinasi (M4).
 */
async function generate({ contents, systemInstruction }) {
  const ai = getClient();

  let response;
  try {
    response = await callWithRetry(() =>
      ai.models.generateContent({
        model: config.geminiModel,
        contents,
        config: systemInstruction ? { systemInstruction } : undefined,
      })
    );
  } catch (err) {
    throw errorRamah(err);
  }

  const text = (response.text || '').trim();
  if (!text) throw new Error('Gemini gak ngasih balasan, coba lagi');

  return text;
}

/**
 * Versi buat percakapan MULTI-TURN (M5). Bedanya sama `generate()`:
 * riwayat obrolan sebelumnya ikut dikirim, jadi Gemini nyambung pas user
 * nanya lanjutan ("dari situ ke bandara berapa lama?") tanpa harus
 * ngulang konteks.
 *
 * @param {Array} history - [{ role: 'user'|'model', parts: [{ text }] }]
 */
async function chat({ history = [], message, systemInstruction }) {
  const ai = getClient();

  const session = ai.chats.create({
    model: config.geminiModel,
    history,
    config: systemInstruction ? { systemInstruction } : undefined,
  });

  let response;
  try {
    response = await callWithRetry(() => session.sendMessage({ message }));
  } catch (err) {
    throw errorRamah(err);
  }

  const text = (response.text || '').trim();
  if (!text) throw new Error('Gemini gak ngasih balasan, coba lagi');

  return text;
}

/**
 * Versi buat fitur yang butuh JSON TERSTRUKTUR, bukan prosa - dipake M5
 * buat generate itinerary.
 *
 * Bedanya sama `generate()`: `responseMimeType: 'application/json'` +
 * `responseSchema` bikin Gemini balikin JSON beneran, bukan teks yang
 * kebetulan mirip JSON. Ini jauh lebih andal daripada cuma nulis "BALAS
 * DENGAN JSON SAJA" di prompt - instruksi kayak gitu gampang dilanggar,
 * model suka nambahin ```json di depan atau kalimat pembuka.
 *
 * PENTING: meski udah pake schema, hasilnya TETEP divalidasi lagi di
 * services/itinerarySchema.js. Schema cuma ngatur BENTUK-nya, gak bisa
 * ngatur ISI-nya - Gemini tetep bisa ngasih 3 hari padahal diminta 5,
 * atau ngarang tempat yang gak ada.
 */
async function generateJson({ prompt, systemInstruction, responseSchema }) {
  const ai = getClient();

  let response;
  try {
    response = await callWithRetry(() =>
      ai.models.generateContent({
        model: config.geminiModel,
        contents: prompt,
        config: {
          ...(systemInstruction ? { systemInstruction } : {}),
          responseMimeType: 'application/json',
          ...(responseSchema ? { responseSchema } : {}),
        },
      })
    );
  } catch (err) {
    throw errorRamah(err);
  }

  const text = (response.text || '').trim();
  if (!text) throw new Error('Gemini gak ngasih balasan, coba lagi');

  try {
    return JSON.parse(text);
  } catch {
    // Jaring pengaman: kalau model tetep bandel ngasih ```json ... ```
    // walau udah disuruh JSON mode, ambil kurung kurawal terluarnya aja.
    const awal = text.indexOf('{');
    const akhir = text.lastIndexOf('}');

    if (awal !== -1 && akhir > awal) {
      try {
        return JSON.parse(text.slice(awal, akhir + 1));
      } catch {
        // tetep gagal, jatuh ke error di bawah
      }
    }

    throw new Error('Balasan AI bukan JSON yang valid');
  }
}

/**
 * M2: bikin 3 pilihan caption buat artikel wisata.
 *
 * Ditulis di atas `generateJson()` (bukan manggil ai.models langsung)
 * supaya ikut kebagian retry otomatis pas Gemini lagi sibuk - dulu versi
 * M2 manggil client-nya sendiri, jadi 503 sekali langsung gagal.
 */
async function generateCaption(title, content) {
  if (!title || !content) {
    throw new Error('Judul dan isi artikel wajib diisi');
  }

  const prompt = `
Kamu AI assistant untuk website wisata bernama TrAvelIt.
Tugas kamu bikin 3 pilihan caption untuk sebuah artikel wisata.

Judul artikel:
${title}

Isi artikel:
${content}

Ketentuan:
- Gunakan bahasa Indonesia.
- Caption harus menarik, singkat, dan mudah dipahami.
- Caption harus relevan dengan isi artikel.
- Cocok dipakai untuk website artikel wisata.
- Jangan membuat informasi yang tidak ada dalam artikel.
- Setiap pilihan caption harus berbeda.
- Jangan pakai tanda kutip di awal atau akhir caption.
`.trim();

  // Dibungkus objek (bukan array telanjang) karena beberapa versi API
  // nolak schema bertipe array di level paling atas.
  const hasil = await generateJson({
    prompt,
    responseSchema: {
      type: 'object',
      properties: {
        captions: { type: 'array', items: { type: 'string' } },
      },
      required: ['captions'],
    },
  });

  const captions = (Array.isArray(hasil) ? hasil : hasil.captions || [])
    .filter((c) => typeof c === 'string')
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .slice(0, 3);

  if (captions.length === 0) throw new Error('Gemini tidak menghasilkan caption');

  return captions;
}

/**
 * M4: bikin draft deskripsi destinasi wisata.
 */
async function generateDescription({ name, category = 'destinasi wisata', city = '', notes = '' }) {
  if (!name || name.trim() === '') {
    throw new Error('Nama destinasi wajib diisi sebelum generate deskripsi AI');
  }

  const prompt = `Kamu pakar pariwisata dan copywriter profesional untuk platform wisata "TrAvelIt".
Buatlah deskripsi destinasi yang informatif dan menarik untuk wisatawan:

- Nama Destinasi: ${name.trim()}
- Kategori: ${String(category || '').trim()}
${city && city.trim() ? `- Lokasi: ${city.trim()}` : ''}
${notes && notes.trim() ? `- Instruksi/Detail Khusus: ${notes.trim()}` : ''}

Panduan Penulisan:
1. Awali 1 paragraf tentang daya tarik utama destinasi ini.
2. Berikan poin-poin hal menarik yang bisa dilakukan di sana.
3. Berikan tips singkat berkunjung (waktu terbaik, yang perlu disiapkan).
4. Bahasa Indonesia yang baku, profesional, mudah dipahami.
5. Langsung berikan teks deskripsinya tanpa kalimat pembuka atau penutup basa-basi.
6. Jangan mengarang harga tiket atau jam operasional yang spesifik.`;

  return generate({ contents: prompt });
}

/**
 * M1: narasiin rekomendasi waktu berkunjung berdasarkan data cuaca
 * terkini kota tujuan (dari services/weather.service.js).
 *
 * Sengaja cuma dikasih angka cuaca yang sudah diringkas (bukan payload
 * mentah OpenWeatherMap) - lebih murah, dan AI gak perlu tau bentuk
 * respons API cuacanya.
 */
async function narasiWaktuBerkunjung({ city, condition, description, temp, humidity, windSpeed }) {
  if (!city) {
    throw new Error('Data kota wajib ada sebelum minta narasi AI');
  }

  const prompt = `
Kamu asisten wisata untuk platform "TrAvelIt".
Berikut kondisi cuaca TERKINI di ${city}:
- Kondisi: ${condition || 'tidak diketahui'} (${description || '-'})
- Suhu: ${temp}°C
- Kelembapan: ${humidity ?? '-'}%
- Kecepatan angin: ${windSpeed ?? '-'} m/s

Tugasmu: tulis rekomendasi singkat (maksimal 3 kalimat) soal enak atau
tidaknya jalan-jalan ke ${city} berdasarkan cuaca di atas, plus satu
saran praktis (misal bawa payung, jaket, sunscreen, atau waktu terbaik
dalam sehari untuk keluar).

Ketentuan:
- Bahasa Indonesia yang hangat dan santai, bukan istilah cuaca teknis.
- Jangan mengulang angka suhu/kelembapan, langsung ke rekomendasinya.
- Jangan pakai tanda kutip di awal atau akhir kalimat.
`.trim();

  return generate({ contents: prompt });
}

module.exports = {
  getClient,
  pesanRamah,
  generate,
  chat,
  generateJson,
  callWithRetry,
  generateCaption, // M2
  generateDescription, // M4
  narasiWaktuBerkunjung, // M1
};
