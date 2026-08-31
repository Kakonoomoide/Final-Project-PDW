const path = require('path');

const VIEWS_DIR = path.join(__dirname, '../views');

function serve(relativePath) {
  return (req, res) => res.sendFile(path.join(VIEWS_DIR, relativePath));
}

module.exports = {
  // auth
  loginPage: serve('auth/login.html'),
  registerPage: serve('auth/register.html'),

  // user (public)
  landingPage: serve('user/landing.html'), // M1
  userProductsPage: serve('user/products.html'), // M3
  chatPage: serve('user/chat.html'), // M5

  // admin (proteksi requireAdmin dipasang di routes)
  adminDashboard: serve('admin/dashboard.html'),
  adminNewsPage: serve('admin/news.html'), // M2
  adminProductsPage: serve('admin/products.html'), // M4
};
