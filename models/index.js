const sequelize = require('../config/database');
const User = require('./user.model');
const Product = require('./product.model');

// Relasi User (Admin) -> Products (M4)
User.hasMany(Product, { foreignKey: 'createdBy', as: 'products' });
Product.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = { sequelize, User, Product };
