const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');

if (!config.geminiApiKey) {
  console.warn('WARNING: GEMINI_API_KEY belum diatur di file .env');
}

const ai = new GoogleGenAI({
  apiKey: config.geminiApiKey,
});

async function generateCaption(title, content) {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi');
  }

  if (!title || !content) {
    throw new Error('Judul dan isi berita wajib diisi');
  }

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
  generateCaption,
};