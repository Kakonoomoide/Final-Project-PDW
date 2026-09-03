const { ChatMessage } = require('../models');
const gemini = require('./gemini.service');

/**
 * Logic fitur M5: chat asisten perjalanan (multi-turn) + identifikasi
 * tempat dari foto. Urusan HTTP-nya ada di
 * controllers/chat.controller.js, di sini murni logic + query database.
 *
 * Fitur ini pelengkap perencana rute (services/trip.service.js): chat
 * buat nanya-nanya dan nimbang-nimbang, planner buat nyusun jadwalnya.
 */

// Berapa pesan terakhir yang dikirim balik ke Gemini sebagai konteks.
// Gak semua riwayat dikirim: makin panjang konteks makin mahal & lambat,
// dan buat konsultasi biasanya yang relevan cuma obrolan terakhir.
const MAX_HISTORY = 20;

/**
 * "Kepribadian" AI-nya. Ditaruh di system instruction (bukan diselipin ke
 * pesan user) supaya aturannya konsisten sepanjang percakapan dan gak
 * bisa ketimpa sama pesan user berikutnya.
 */
const SYSTEM_INSTRUCTION = `
Kamu adalah asisten perjalanan di aplikasi TrAvelIt.
Tugasmu bantu wisatawan Indonesia merencanakan dan menjalani perjalanan.

Aturan menjawab:
- Selalu jawab dalam Bahasa Indonesia yang santai tapi sopan.
- Jawab ringkas dan langsung ke inti (maksimal sekitar 4 paragraf pendek).
- Kalau menjelaskan langkah-langkah atau urutan kunjungan, pakai poin bernomor.
- Kalau menyebut biaya, sebutkan sebagai PERKIRAAN dan sertakan satuannya
  (misal "sekitar Rp 50.000 per orang"), jangan seolah-olah harga pasti.
- Kalau pertanyaannya kurang jelas (belum jelas kota tujuannya, berapa hari,
  budget berapa, pergi berapa orang), tanya balik dulu sebelum menyarankan.
- Kalau user minta dibuatkan itinerary lengkap, jawab seadanya lalu arahkan
  ke halaman "Rencana Perjalanan" (/planner) yang bisa menyusun jadwal
  harian sekaligus memetakannya.
- Kalau ditanya hal DI LUAR perjalanan dan pariwisata, tolak dengan halus
  dan arahkan balik ke topik perjalanan.
- Jangan mengarang nama tempat, harga tiket, atau jadwal transportasi.
  Kalau belum yakin, bilang belum yakin dan sarankan cek ke sumber resmi.
`.trim();

/**
 * Instruksi khusus buat analisa foto. Dipisah dari system instruction
 * chat karena outputnya beda: di sini maunya format identifikasi yang
 * terstruktur, biar user gampang baca hasilnya.
 */
const VISION_INSTRUCTION = `
${SYSTEM_INSTRUCTION}

Sekarang kamu lagi menganalisa FOTO tempat yang dikirim user.
Jawab dengan struktur persis seperti ini:

**Perkiraan tempat:** (nama tempat atau landmark, atau "tidak bisa dipastikan")
**Lokasi:** (kota & negara kalau bisa ditebak)
**Tingkat keyakinan:** (tinggi / sedang / rendah)
**Yang terlihat di foto:** (poin-poin ciri yang kamu pakai buat menebak)
**Kenapa menarik dikunjungi:** (2-3 poin singkat)
**Tips berkunjung:** (waktu terbaik, perkiraan biaya masuk, yang perlu disiapkan)

Kalau fotonya buram, kegelapan, atau BUKAN foto tempat/pemandangan, jangan
mengarang - bilang saja fotonya kurang jelas dan minta user kirim foto lain
yang memperlihatkan bangunan atau pemandangannya.

PENTING: jangan menebak nama tempat yang spesifik kalau keyakinanmu rendah.
Lebih baik bilang "ini terlihat seperti pantai tropis, tapi saya tidak bisa
memastikan yang mana" daripada menyebut nama yang keliru - orang bisa saja
merencanakan perjalanan berdasarkan jawabanmu.
`.trim();

/** Ambil riwayat chat seorang user, urut dari yang paling lama. */
async function getHistory(userId) {
  return ChatMessage.findAll({
    where: { userId },
    order: [['id', 'ASC']],
  });
}

/**
 * Ubah baris database jadi format history yang dimengerti Gemini.
 * Cuma diambil MAX_HISTORY pesan terakhir (liat alasannya di atas).
 */
function toGeminiHistory(rows) {
  return rows.slice(-MAX_HISTORY).map((row) => ({
    role: row.role,
    parts: [{ text: row.content }],
  }));
}

function saveMessage({ userId, role, content, hasImage = false }) {
  return ChatMessage.create({ userId, role, content, hasImage });
}

/**
 * Chat multi-turn. Alurnya: ambil riwayat lama -> kirim ke Gemini bareng
 * pesan baru -> simpen pesan user & balasan AI ke database.
 *
 * Pesan user baru disimpen SETELAH Gemini balas (bukan sebelum), biar
 * kalo Gemini-nya error, riwayatnya gak keisi pesan gantung yang gak ada
 * jawabannya.
 */
async function sendMessage({ userId, message }) {
  const riwayat = await getHistory(userId);

  const reply = await gemini.chat({
    history: toGeminiHistory(riwayat),
    message,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  await saveMessage({ userId, role: 'user', content: message });
  await saveMessage({ userId, role: 'model', content: reply });

  return reply;
}

/**
 * Identifikasi tempat dari foto (Gemini Vision).
 *
 * Fotonya dikirim dari browser sebagai data URL
 * ("data:image/jpeg;base64,....") terus dipecah jadi mimeType + base64
 * murni, soalnya Gemini maunya dua-duanya kepisah.
 */
function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i.exec(dataUrl || '');
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function identifyPlace({ userId, imageDataUrl, note }) {
  const image = parseDataUrl(imageDataUrl);
  if (!image) {
    return { success: false, message: 'Format foto gak didukung (pakai JPG, PNG, atau WEBP)' };
  }

  const pertanyaan = note?.trim()
    ? `Tolong kenali foto tempat ini. Catatan tambahan dari saya: ${note.trim()}`
    : 'Tolong kenali foto tempat ini, ini di mana dan menariknya apa?';

  // Riwayat obrolan ikut dikirim biar AI-nya nyambung kalo sebelumnya
  // user udah cerita mau ke kota mana / budgetnya berapa.
  const riwayat = toGeminiHistory(await getHistory(userId));

  const reply = await gemini.generate({
    systemInstruction: VISION_INSTRUCTION,
    contents: [
      ...riwayat,
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: image.mimeType, data: image.data } },
          { text: pertanyaan },
        ],
      },
    ],
  });

  // Yang disimpen cuma teksnya, fotonya nggak (biar database gak bengkak).
  // Ditandain hasImage: true supaya di UI tetep keliatan "ini dari foto".
  await saveMessage({ userId, role: 'user', content: pertanyaan, hasImage: true });
  await saveMessage({ userId, role: 'model', content: reply });

  return { success: true, reply };
}

async function clearHistory(userId) {
  return ChatMessage.destroy({ where: { userId } });
}

module.exports = { getHistory, sendMessage, identifyPlace, clearHistory };
