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
 * Dipake fitur yang SEKALI JALAN (gak butuh riwayat) - contoh: deteksi
 * foto hama (M5), generate caption (M2), generate deskripsi (M4).
 */
async function generate({ contents, systemInstruction }) {
  const ai = getClient();

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: config.geminiModel,
      contents,
      config: systemInstruction ? { systemInstruction } : undefined,
    })
  );

  const text = (response.text || '').trim();
  if (!text) throw new Error('Gemini gak ngasih balasan, coba lagi');

  return text;
}

/**
 * Versi buat percakapan MULTI-TURN (M5). Bedanya sama `generate()`:
 * riwayat obrolan sebelumnya ikut dikirim, jadi Gemini nyambung pas user
 * nanya lanjutan ("terus obatnya apa?") tanpa harus ngulang konteks.
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

  const response = await callWithRetry(() => session.sendMessage({ message }));

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

  const response = await callWithRetry(() =>
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

module.exports = { getClient, generate, chat, generateJson, callWithRetry };
