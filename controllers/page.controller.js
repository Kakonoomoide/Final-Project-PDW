const path = require('path');

const VIEWS_DIR = path.join(__dirname, '../views');

function serve(relativePath) {
  return (req, res) => res.sendFile(path.join(VIEWS_DIR, relativePath));
}

module.exports = {
  // auth
  loginPage: serve('auth/login.html'),
  registerPage: serve('auth/register.html'),

  // user (publik)
  landingPage: serve('user/landing.html'), // M1
  destinationsPage: serve('user/destinations.html'), // M3
  plannerPage: serve('user/planner.html'), // M5
  tripDetailPage: serve('user/trip.html'), // M5
  chatPage: serve('user/chat.html'), // M5

  // admin (proteksi requireAdminPage dipasang di routes)
  adminDashboard: serve('admin/dashboard.html'),
  adminArticlesPage: serve('admin/articles.html'), // M2
  adminDestinationsPage: serve('admin/destinations.html'), // M4
};
