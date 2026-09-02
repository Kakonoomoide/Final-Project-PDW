const authService = require('../services/auth.service');
const sendResponse = require('../utils/response');

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return sendResponse(res, { code: 400, success: false, message: 'name, email, password wajib diisi' });
    }
    if (password.length < 6) {
      return sendResponse(res, { code: 400, success: false, message: 'Password minimal 6 karakter' });
    }

    const result = await authService.registerUser({ name, email, password });
    if (!result.success) {
      return sendResponse(res, { code: 409, success: false, message: result.message });
    }

    return sendResponse(res, {
      code: 201,
      message: 'Registrasi berhasil, silakan login',
      data: { id: result.user.id, name: result.user.name, email: result.user.email },
    });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendResponse(res, { code: 400, success: false, message: 'email dan password wajib diisi' });
    }

    const result = await authService.loginUser({ email, password });
    if (!result.success) {
      return sendResponse(res, { code: 401, success: false, message: result.message });
    }

    req.session.userId = result.user.id;
    req.session.role = result.user.role;
    req.session.name = result.user.name;

    return sendResponse(res, {
      message: 'Login berhasil',
      data: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role },
    });
  } catch (err) {
    return sendResponse(res, { code: 500, success: false, message: err.message });
  }
}

function logout(req, res) {
  req.session.destroy((err) => {
    if (err) return sendResponse(res, { code: 500, success: false, message: 'Gagal logout' });
    res.clearCookie('connect.sid');
    return sendResponse(res, { message: 'Logout berhasil' });
  });
}

// dipake frontend (navbar) buat ngecek "lagi login sebagai siapa"
function me(req, res) {
  if (!req.session || !req.session.userId) {
    return sendResponse(res, { code: 401, success: false, message: 'Belum login' });
  }
  return sendResponse(res, {
    data: { id: req.session.userId, name: req.session.name, role: req.session.role },
  });
}

module.exports = { register, login, logout, me };
