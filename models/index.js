const sequelize = require("../config/database");
const User = require("./user.model");
const News = require("./news.model");

User.hasMany(News, {
  foreignKey: "createdBy",
  as: "news",
});

News.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

module.exports = {
  sequelize,
  User,
  News,
};