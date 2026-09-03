const chatService = require('../services/chat.service');
const sendResponse = require('../utils/response');

/**
 * Controller fitur M5 (chat asisten perjalanan + identifikasi tempat).
 * Tipis aja: validasi input, panggil service, bungkus pake sendResponse.
 *
 * Semua endpoint di sini dipasangin `requireAuth` di routes-nya, jadi
 * `req.session.userId` dijamin ada pas nyampe fungsi-fungsi ini.
 */

const MAX_PANJANG_PESAN = 2000;

async function sendMessage(req, res) {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return sendResponse(res, { code: 400, success: false, message: 'Pesan gak boleh kosong' });
    }
    if (message.length > MAX_PANJANG_PESAN) {
      return sendResponse(res, {
        code: 400,
        success: false,
        message: `Pesan kepanjangan (maksimal ${MAX_PANJANG_PESAN} karakter)`,
      });
    }

    const reply = await chatService.sendMessage({
      userId: req.session.userId,
      message: message.trim(),
    });

    return sendResponse(res, { message: 'Balasan AI berhasil dibuat', data: { reply } });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function detect(req, res) {
  try {
    const { image, note } = req.body;

    if (!image) {
      return sendResponse(res, { code: 400, success: false, message: 'Foto tempat wajib diupload' });
    }

    const result = await chatService.identifyPlace({
      userId: req.session.userId,
      imageDataUrl: image,
      note,
    });

    if (!result.success) {
      return sendResponse(res, { code: 400, success: false, message: result.message });
    }

    return sendResponse(res, { message: 'Foto berhasil dianalisa', data: { reply: result.reply } });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

// dipake pas halaman chat pertama kali dibuka, biar obrolan sebelumnya
// gak ilang cuma gara-gara halamannya di-refresh
async function history(req, res) {
  try {
    const rows = await chatService.getHistory(req.session.userId);

    return sendResponse(res, {
      data: rows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        hasImage: row.hasImage,
        createdAt: row.createdAt,
      })),
    });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function clearHistory(req, res) {
  try {
    await chatService.clearHistory(req.session.userId);
    return sendResponse(res, { message: 'Riwayat chat dihapus' });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

module.exports = { sendMessage, detect, history, clearHistory };
