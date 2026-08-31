const sequelize = require('../config/database');

const User = require('./user.model');
const Product = require('./product.model');
const News = require('./news.model');

// Relasi User (Admin) -> Products (M4)
User.hasMany(Product, {
  foreignKey: 'createdBy',
  as: 'products',
});

Product.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

// Relasi User (Admin) -> News (M2)
User.hasMany(News, {
  foreignKey: 'createdBy',
  as: 'news',
});

News.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

module.exports = {
  sequelize,
  User,
  Product,
  News,
};