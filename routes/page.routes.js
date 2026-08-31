const express = require('express');
const path = require('path');
const router = express.Router();

// serve views/index.html pas orang buka "/"
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

module.exports = router;
