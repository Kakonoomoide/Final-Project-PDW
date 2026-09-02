const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');

let aiClient = null;

/**
 * Mendapatkan instance GoogleGenAI client singleton
 */
function getClient() {
  const apiKey = config.geminiApiKey;
  if (!apiKey || apiKey === 'isi-api-key-kalian-disini' || apiKey.trim() === '') {
    throw new Error(
      'GEMINI_API_KEY belum dikonfigurasi di file .env. Silakan masukkan API key Gemini yang valid.'
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Fitur M4: Generate rekomendasi deskripsi produk bahan pertanian
 * @param {Object} params
 * @param {string} params.name - Nama produk (misal: "Pupuk Urea NPK Mutiara 16-16-16")
 * @param {string} [params.category] - Kategori produk (bibit, pupuk, alat, pestisida)
 * @param {string} [params.notes] - Catatan atau instruksi khusus opsional
 * @returns {Promise<string>} Deskripsi produk yang dihasilkan oleh Gemini AI
 */
async function generateDescription({ name, category = 'bahan pertanian', notes = '' }) {
  if (!name || name.trim() === '') {
    throw new Error('Nama produk wajib diisi sebelum generate deskripsi AI');
  }

  const ai = getClient();
  const prompt = `Kamu adalah pakar pertanian dan copywriter profesional untuk toko bahan pertanian "Tani Makmur".
Buatlah deskripsi produk yang informatif, menarik, dan bermanfaat bagi petani/pembeli untuk produk berikut:

- Nama Produk: ${name.trim()}
- Kategori: ${category.trim()}
${notes && notes.trim() ? `- Instruksi/Detail Khusus: ${notes.trim()}` : ''}

Panduan Penulisan:
1. Awali dengan 1 paragraf penjelasan fungsi dan keunggulan utama produk.
2. Berikan poin-poin keunggulan atau manfaat utama bagi tanaman/lahan pertanian.
3. Berikan rekomendasi singkat cara penggunaan atau dosis pengaplikasian yang sesuai.
4. Gunakan Bahasa Indonesia yang baku, profesional, dan mudah dipahami.
5. Langsung berikan teks deskripsi produk tanpa kalimat pembuka atau penutup basa-basi.`;

  const modelName = config.geminiModel || 'gemini-2.5-flash';

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
  });

  if (!response || !response.text) {
    throw new Error('Tidak ada respon teks yang dihasilkan oleh Gemini AI');
  }

  return response.text.trim();
}

module.exports = {
  getClient,
  generateDescription,
};
