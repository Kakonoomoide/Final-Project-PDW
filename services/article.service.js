const { Article, User } = require('../models');

/**
 * Logic CRUD artikel wisata (M2).
 *
 * Asalnya `news.service.js` yang ditulis M2 buat tabel `news`. Isinya
 * dipertahankan apa adanya, cuma diganti nama entitasnya ngikutin tema
 * TrAvelIt: News -> Article, berita -> artikel wisata.
 */

async function getAllArticles() {
  return Article.findAll({
    include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
  });
}

async function getArticleById(id) {
  return Article.findByPk(id, {
    include: [{ model: User, as: 'author', attributes: ['id', 'name'] }],
  });
}

async function createArticle({ title, caption, content, imageUrl, createdBy }) {
  return Article.create({ title, caption, content, imageUrl, createdBy });
}

async function updateArticle(id, { title, caption, content, imageUrl }) {
  const article = await Article.findByPk(id);
  if (!article) return null;

  await article.update({ title, caption, content, imageUrl });
  return article;
}

async function deleteArticle(id) {
  const article = await Article.findByPk(id);
  if (!article) return null;

  await article.destroy();
  return article;
}

module.exports = {
  getAllArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
};
