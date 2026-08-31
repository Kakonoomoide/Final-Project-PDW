function sendResponse(res, { code = 200, success = true, message = '', data = null }) {
  return res.status(code).json({ code, success, message, data });
}

module.exports = sendResponse;
