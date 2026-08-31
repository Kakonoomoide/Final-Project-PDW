const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');

let aiClient = null;

/**
 * Mendapatkan instance GoogleGenAI client singleton
 */
function getClient() {
  const apiKey = config.geminiApiKey;

  if (
    !apiKey ||
    apiKey === 'isi-api-key-kalian-disini' ||
    apiKey.trim() === ''
  ) {
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
 * M4: Generate rekomendasi deskripsi produk bahan pertanian
 */
async function generateDescription({
  name,
  category = 'bahan pertanian',
  notes = '',
}) {
  if (!name || name.trim() === '') {
    throw new Error(
      'Nama produk wajib diisi sebelum generate deskripsi AI'
    );
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
    throw new Error(
      'Tidak ada respon teks yang dihasilkan oleh Gemini AI'
    );
  }

  return response.text.trim();
}

/**
 * M2: Generate 3 rekomendasi caption berita
 */
async function generateCaption(title, content) {
  if (!title || !content) {
    throw new Error('Judul dan isi berita wajib diisi');
  }

  const ai = getClient();

  const prompt = `
Kamu adalah AI assistant untuk website toko bahan pertanian bernama Tani Makmur.
Tugas kamu adalah membuat 3 pilihan caption untuk sebuah berita pertanian.

Judul berita:
${title}

Isi berita:
${content}

Ketentuan:
- Gunakan bahasa Indonesia.
- Caption harus menarik, singkat, dan mudah dipahami.
- Caption harus relevan dengan isi berita.
- Cocok digunakan untuk website berita pertanian.
- Jangan membuat informasi yang tidak terdapat dalam berita.
- Setiap pilihan caption harus berbeda.
- Jangan gunakan tanda kutip pada awal atau akhir caption.
- Hanya kembalikan JSON array yang berisi 3 string caption.
`;

  const response = await ai.models.generateContent({
    model: config.geminiModel,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
  });

  if (!response || !response.text) {
    throw new Error('Gemini tidak memberikan hasil');
  }

  let captions;

  try {
    captions = JSON.parse(response.text);
  } catch (error) {
    console.error('Response Gemini:', response.text);
    throw new Error('Format response dari Gemini tidak valid');
  }

  if (!Array.isArray(captions)) {
    throw new Error('Response Gemini bukan berupa array caption');
  }

  captions = captions
    .filter((caption) => typeof caption === 'string')
    .map((caption) => caption.trim())
    .filter((caption) => caption.length > 0)
    .slice(0, 3);

  if (captions.length === 0) {
    throw new Error('Gemini tidak menghasilkan caption');
  }

  return captions;
}

module.exports = {
  getClient,
  generateDescription,
  generateCaption,
};