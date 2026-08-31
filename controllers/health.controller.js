const { getHealthStatus } = require('../services/health.service');
const sendResponse = require('../utils/response');

function getHealth(req, res) {
  const health = getHealthStatus();

  return sendResponse(res, {
    message: 'Backend jalan normal',
    data: health,
  });
}

module.exports = { getHealth };
