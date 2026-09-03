const destinationService = require('../services/destination.service');
const sendResponse = require('../utils/response');

/**
 * Controller katalog destinasi wisata (M4).
 * Asalnya `product.controller.js`, dipetakan ke tema TrAvelIt.
 */

async function getAll(req, res) {
  try {
    const destinations = await destinationService.getAllDestinations(req.query);
    return sendResponse(res, { message: 'Data destinasi berhasil diambil', data: destinations });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Gagal mengambil data destinasi',
    });
  }
}

async function getStats(req, res) {
  try {
    const stats = await destinationService.getDestinationStats();
    return sendResponse(res, { message: 'Statistik destinasi berhasil diambil', data: stats });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Gagal mengambil statistik destinasi',
    });
  }
}

async function getById(req, res) {
  try {
    const destination = await destinationService.getDestinationById(req.params.id);
    if (!destination) {
      return sendResponse(res, { code: 404, success: false, message: 'Destinasi tidak ditemukan' });
    }
    return sendResponse(res, { data: destination });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Gagal mengambil detail destinasi',
    });
  }
}

async function create(req, res) {
  try {
    const { name, category, city, province, description, ticketPrice, lat, lng, imageUrl } = req.body;

    if (!name || !category || !city) {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: 'Nama, kategori, dan kota wajib diisi',
      });
    }

    const destination = await destinationService.createDestination({
      name,
      category,
      city,
      province,
      description,
      ticketPrice,
      lat,
      lng,
      imageUrl,
      createdBy: req.session ? req.session.userId : null,
    });

    return sendResponse(res, {
      code: 201,
      message: 'Destinasi berhasil ditambahkan',
      data: destination,
    });
  } catch (err) {
    return sendResponse(res, {
      code: 400,
      success: false,
      message: err.message || 'Gagal menambahkan destinasi',
    });
  }
}

async function update(req, res) {
  try {
    const destination = await destinationService.updateDestination(req.params.id, req.body);
    if (!destination) {
      return sendResponse(res, { code: 404, success: false, message: 'Destinasi tidak ditemukan' });
    }
    return sendResponse(res, { message: 'Destinasi berhasil diperbarui', data: destination });
  } catch (err) {
    return sendResponse(res, {
      code: 400,
      success: false,
      message: err.message || 'Gagal memperbarui destinasi',
    });
  }
}

async function remove(req, res) {
  try {
    const terhapus = await destinationService.deleteDestination(req.params.id);
    if (!terhapus) {
      return sendResponse(res, {
        code: 404,
        success: false,
        message: 'Destinasi tidak ditemukan atau sudah dihapus',
      });
    }
    return sendResponse(res, { message: 'Destinasi berhasil dihapus' });
  } catch (err) {
    return sendResponse(res, {
      code: 500,
      success: false,
      message: err.message || 'Gagal menghapus destinasi',
    });
  }
}

async function generateDescription(req, res) {
  try {
    const { name, category, city, notes } = req.body;

    if (!name || name.trim() === '') {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: 'Nama destinasi wajib diisi sebelum generate deskripsi AI',
      });
    }

    const description = await destinationService.generateAiDescription({
      name,
      category,
      city,
      notes,
    });

    return sendResponse(res, {
      message: 'Deskripsi berhasil dibuat oleh AI',
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

module.exports = { getAll, getStats, getById, create, update, remove, generateDescription };
