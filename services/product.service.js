const { Op } = require('sequelize');
const { Product, User } = require('../models');
const geminiService = require('./gemini.service');

/**
 * Service untuk Pengelolaan Bahan Pertanian (Jobdesk M4)
 */

/**
 * Mengambil semua produk dengan filter dan search opsional
 */
async function getAllProducts(query = {}) {
  const { search, category, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
  const where = {};

  if (search && search.trim() !== '') {
    where[Op.or] = [
      { name: { [Op.like]: `%${search.trim()}%` } },
      { description: { [Op.like]: `%${search.trim()}%` } },
    ];
  }

  if (category && category.trim() !== '' && category !== 'all') {
    where.category = category.trim().toLowerCase();
  }

  const validSortFields = ['id', 'name', 'price', 'stock', 'createdAt', 'category'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const products = await Product.findAll({
    where,
    order: [[orderField, orderDirection]],
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email'],
      },
    ],
  });

  return products;
}

/**
 * Mengambil detail 1 produk berdasarkan ID
 */
async function getProductById(id) {
  const product = await Product.findByPk(id, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email'],
      },
    ],
  });

  return product;
}

/**
 * Menambahkan produk baru
 */
async function createProduct({ name, category, description, price, stock, imageUrl, createdBy }) {
  if (!name || name.trim() === '') {
    throw new Error('Nama produk wajib diisi');
  }
  if (!category || category.trim() === '') {
    throw new Error('Kategori produk wajib diisi');
  }

  const parsedPrice = parseInt(price, 10);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    throw new Error('Harga harus berupa angka positif');
  }

  const parsedStock = parseInt(stock, 10);
  if (isNaN(parsedStock) || parsedStock < 0) {
    throw new Error('Stok harus berupa angka positif atau nol');
  }

  const product = await Product.create({
    name: name.trim(),
    category: category.trim().toLowerCase(),
    description: description ? description.trim() : null,
    price: parsedPrice,
    stock: parsedStock,
    imageUrl: imageUrl && imageUrl.trim() !== '' ? imageUrl.trim() : null,
    createdBy: createdBy || null,
  });

  return product;
}

/**
 * Mengupdate data produk
 */
async function updateProduct(id, data) {
  const product = await Product.findByPk(id);
  if (!product) {
    return null;
  }

  const updates = {};
  if (data.name !== undefined) {
    if (!data.name.trim()) throw new Error('Nama produk tidak boleh kosong');
    updates.name = data.name.trim();
  }
  if (data.category !== undefined) {
    if (!data.category.trim()) throw new Error('Kategori produk tidak boleh kosong');
    updates.category = data.category.trim().toLowerCase();
  }
  if (data.description !== undefined) {
    updates.description = data.description ? data.description.trim() : null;
  }
  if (data.price !== undefined) {
    const parsedPrice = parseInt(data.price, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) throw new Error('Harga harus berupa angka positif');
    updates.price = parsedPrice;
  }
  if (data.stock !== undefined) {
    const parsedStock = parseInt(data.stock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) throw new Error('Stok harus berupa angka positif');
    updates.stock = parsedStock;
  }
  if (data.imageUrl !== undefined) {
    updates.imageUrl = data.imageUrl && data.imageUrl.trim() !== '' ? data.imageUrl.trim() : null;
  }

  await product.update(updates);
  return product;
}

/**
 * Menghapus produk berdasarkan ID
 */
async function deleteProduct(id) {
  const product = await Product.findByPk(id);
  if (!product) {
    return false;
  }
  await product.destroy();
  return true;
}

/**
 * Statistik ringkasan produk (total produk, total stok, per kategori)
 */
async function getProductStats() {
  const totalProducts = await Product.count();
  const allProducts = await Product.findAll({ attributes: ['category', 'stock', 'price'] });

  let totalStock = 0;
  const categoryCounts = {};

  allProducts.forEach((p) => {
    totalStock += p.stock || 0;
    const cat = p.category || 'lainnya';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return {
    totalProducts,
    totalStock,
    categoryCounts,
  };
}

/**
 * Memanggil Gemini AI untuk generate rekomendasi deskripsi produk
 */
async function generateAiDescription({ name, category, notes }) {
  return await geminiService.generateDescription({ name, category, notes });
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  generateAiDescription,
};
