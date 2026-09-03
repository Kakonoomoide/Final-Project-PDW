const { ChatMessage } = require('../models');
const gemini = require('./gemini.service');

/**
 * Logic fitur M5: chat konsultasi pertanian (multi-turn) + deteksi
 * hama/penyakit dari foto tanaman. Urusan HTTP-nya ada di
 * controllers/chat.controller.js, di sini murni logic + query database.
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
Kamu adalah penyuluh pertanian di toko bahan pertanian "Tani Makmur".
Tugasmu bantu petani Indonesia konsultasi seputar pertanian.

Aturan menjawab:
- Selalu jawab dalam Bahasa Indonesia yang santai tapi sopan.
- Jawab ringkas dan langsung ke inti (maksimal sekitar 4 paragraf pendek).
- Kalau menjelaskan langkah-langkah, pakai poin bernomor.
- Kalau menyarankan pupuk/pestisida, sebutkan bahan aktif atau jenisnya
  (misal "pupuk NPK 16-16-16"), jangan cuma merek dagang.
- Kalau pertanyaannya kurang jelas (belum jelas tanaman apa, umur berapa,
  gejalanya gimana), tanya balik dulu sebelum kasih kesimpulan.
- Kalau ditanya hal DI LUAR pertanian, tolak dengan halus dan arahkan
  balik ke topik pertanian.
- Jangan mengarang. Kalau memang belum yakin, bilang belum yakin dan
  sarankan cek ke penyuluh setempat.
`.trim();

/**
 * Instruksi khusus buat analisa foto. Dipisah dari system instruction
 * chat karena outputnya beda: di sini maunya format diagnosis yang
 * terstruktur, biar user gampang baca hasilnya.
 */
const VISION_INSTRUCTION = `
${SYSTEM_INSTRUCTION}

Sekarang kamu lagi menganalisa FOTO tanaman yang dikirim user.
Jawab dengan struktur persis seperti ini:

**Tanaman:** (perkiraan jenis tanamannya, kalau tidak yakin bilang tidak yakin)
**Diagnosis:** (dugaan hama/penyakit/defisiensi nutrisi, atau "terlihat sehat")
**Tingkat keyakinan:** (tinggi / sedang / rendah)
**Gejala yang terlihat:** (poin-poin apa yang kamu lihat di foto)
**Saran penanganan:** (langkah bernomor, dari yang paling murah/mudah dulu)
**Pencegahan:** (biar tidak terulang)

Kalau fotonya buram, kegelapan, atau BUKAN foto tanaman, jangan mengarang
diagnosis - bilang saja fotonya kurang jelas dan minta user foto ulang
bagian tanaman yang bermasalah dari jarak dekat.
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
 * Deteksi hama/penyakit dari foto (Gemini Vision).
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

async function detectDisease({ userId, imageDataUrl, note }) {
  const image = parseDataUrl(imageDataUrl);
  if (!image) {
    return { success: false, message: 'Format foto gak didukung (pakai JPG, PNG, atau WEBP)' };
  }

  const pertanyaan = note?.trim()
    ? `Tolong analisa foto tanaman ini. Catatan tambahan dari saya: ${note.trim()}`
    : 'Tolong analisa foto tanaman ini, ada masalah apa dan gimana penanganannya?';

  // Riwayat obrolan ikut dikirim biar AI-nya nyambung kalo sebelumnya
  // user udah cerita nanam apa / lahannya di mana.
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

module.exports = { getHistory, sendMessage, detectDisease, clearHistory };
