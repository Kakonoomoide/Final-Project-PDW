const { News, User } = require('../models');

async function getAllNews() {
  return await News.findAll({
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
}

async function getNewsById(id) {
  return await News.findByPk(id, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name'],
      },
    ],
  });
}

async function createNews({ title, caption, content, imageUrl, createdBy }) {
  return await News.create({
    title,
    caption,
    content,
    imageUrl,
    createdBy,
  });
}

async function updateNews(id, { title, caption, content, imageUrl }) {
  const news = await News.findByPk(id);

  if (!news) {
    return null;
  }

  await news.update({
    title,
    caption,
    content,
    imageUrl,
  });

  return news;
}

async function deleteNews(id) {
  const news = await News.findByPk(id);

  if (!news) {
    return null;
  }

  await news.destroy();

  return news;
}

module.exports = {
  getAllNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
};