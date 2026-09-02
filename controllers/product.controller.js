const productService = require('../services/product.service');
const sendResponse = require('../utils/response');

/**
 * Controller untuk Produk Bahan Pertanian (Jobdesk M4)
 */

async function getAll(req, res) {
  try {
    const products = await productService.getAllProducts(req.query);
    return sendResponse(res, {
      code: 200,
      message: 'Data produk berhasil diambil',
      data: products,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Gagal mengambil data produk',
    });
  }
}

async function getStats(req, res) {
  try {
    const stats = await productService.getProductStats();
    return sendResponse(res, {
      code: 200,
      message: 'Statistik produk berhasil diambil',
      data: stats,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Gagal mengambil statistik produk',
    });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    if (!product) {
      return sendResponse(res, {
        code: 404,
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    return sendResponse(res, {
      code: 200,
      data: product,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Gagal mengambil detail produk',
    });
  }
}

async function create(req, res) {
  try {
    const { name, category, description, price, stock, imageUrl } = req.body;

    if (!name || !category || price === undefined || stock === undefined) {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: 'Nama, kategori, harga, dan stok wajib diisi',
      });
    }

    const createdBy = req.session ? req.session.userId : null;

    const product = await productService.createProduct({
      name,
      category,
      description,
      price,
      stock,
      imageUrl,
      createdBy,
    });

    return sendResponse(res, {
      code: 201,
      message: 'Produk berhasil ditambahkan',
      data: product,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 400,
      success: false,
      message: err.message || 'Gagal menambahkan produk',
    });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const product = await productService.updateProduct(id, req.body);

    if (!product) {
      return sendResponse(res, {
        code: 404,
        success: false,
        message: 'Produk tidak ditemukan',
      });
    }

    return sendResponse(res, {
      code: 200,
      message: 'Produk berhasil diperbarui',
      data: product,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 400,
      success: false,
      message: err.message || 'Gagal memperbarui produk',
    });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const deleted = await productService.deleteProduct(id);

    if (!deleted) {
      return sendResponse(res, {
        code: 404,
        success: false,
        message: 'Produk tidak ditemukan atau sudah dihapus',
      });
    }

    return sendResponse(res, {
      code: 200,
      message: 'Produk berhasil dihapus',
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Gagal menghapus produk',
    });
  }
}

async function generateDescription(req, res) {
  try {
    const { name, category, notes } = req.body;

    if (!name || name.trim() === '') {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: 'Nama produk wajib diisi sebelum generate deskripsi AI',
      });
    }

    const description = await productService.generateAiDescription({
      name,
      category,
      notes,
    });

    return sendResponse(res, {
      code: 200,
      message: 'Deskripsi berhasil digenerate oleh AI Gemini',
      data: { description },
    });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Gagal generate deskripsi dengan AI',
    });
  }
}

module.exports = {
  getAll,
  getStats,
  getById,
  create,
  update,
  remove,
  generateDescription,
};
