const { Product } = require('../models');
const { getClient } = require('./gemini.service');
const config = require('../config/env');

/**
 * Mengambil seluruh daftar produk pertanian
 */
async function getAllProducts(query = {}) {
  const { category } = query;
  const whereClause = {};

  if (category) {
    whereClause.category = category;
  }

  const products = await Product.findAll({ where: whereClause, raw: true });
  return { success: true, products };
}

/**
 * Mengambil detail produk berdasarkan ID
 */
async function getProductById(id) {
  const product = await Product.findByPk(id, { raw: true });
  if (!product) {
    return { success: false, message: 'Produk tidak ditemukan' };
  }
  return { success: true, product };
}

/**
 * M3: Memproses AI Product Finder / Recomendation
 * Memanggil Gemini AI via getClient() dari gemini.service.js
 */
async function getRecommendations(quizAnswers) {
  const products = await Product.findAll({ raw: true });

  if (!products || products.length === 0) {
    return { success: true, data: [] };
  }

  try {
    const ai = getClient();

    const prompt = `
Kamu adalah asisten ahli pertanian untuk toko "Tani Makmur".
Tugas kamu adalah merekomendasikan maksimal 4 produk pertanian dari katalog yang paling sesuai dengan jawaban quiz pengguna.

Jawaban Quiz Pengguna:
${JSON.stringify(quizAnswers, null, 2)}

Daftar Katalog Produk Tersedia:
${JSON.stringify(products, null, 2)}

Ketentuan:
1. Pilih maksimal 4 produk yang paling relevan dengan kebutuhan/jawaban quiz.
2. Hanya kembalikan array angka yang berisi ID dari produk-produk terpilih (contoh: [1, 3, 5]).
3. Jangan tambahkan teks penjelasan atau markdown di luar format JSON.
`;

    const modelName = config.geminiModel || 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'array',
          items: {
            type: 'number',
          },
        },
      },
    });

    if (!response || !response.text) {
      throw new Error('Gemini tidak memberikan respon rekomendasi');
    }

    const recommendedIds = JSON.parse(response.text);

    // Filter data produk utuh dari database berdasarkan ID hasil rekomendasi AI
    let recommendedProducts = products.filter((p) =>
      recommendedIds.includes(p.id)
    );

    // Fallback jika array ID kosong
    if (recommendedProducts.length === 0) {
      recommendedProducts = products.slice(0, 4);
    }

    return { success: true, data: recommendedProducts };
  } catch (err) {
    console.warn('AI Recommendation M3 Gagal, beralih ke fallback manual:', err.message);

    // Fallback manual jika API Key bermasalah / limit habis
    const fallbackMatches = products.slice(0, 4);
    return { success: true, data: fallbackMatches };
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  getRecommendations,
};