/**
 * Format response seragam buat semua endpoint API:
 * { code, success, message, data }
 */
function sendResponse(res, { code = 200, success = true, message = '', data = null }) {
  return res.status(code).json({ code, success, message, data });
}

module.exports = sendResponse;
