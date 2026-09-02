const sendResponse = require('../utils/response');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return sendResponse(res, { code: 401, success: false, message: 'Belum login' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return sendResponse(res, { code: 401, success: false, message: 'Belum login' });
  }
  if (req.session.role !== 'admin') {
    return sendResponse(res, { code: 403, success: false, message: 'Khusus admin' });
  }
  next();
}

/**
 * Versi khusus buat proteksi HALAMAN (bukan API JSON) - kalo belum
 * login/bukan admin, REDIRECT ke /login, bukan balikin JSON error
 * (browser yang lagi navigasi ke halaman butuh redirect, bukan JSON).
 */
function requireAdminPage(req, res, next) {
  if (!req.session || !req.session.userId || req.session.role !== 'admin') {
    return res.redirect('/login');
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireAdminPage };
