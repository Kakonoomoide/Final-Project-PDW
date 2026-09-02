const { Sequelize } = require('sequelize');
const config = require('./env');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.dbStorage,
  logging: false,
});

module.exports = sequelize;
