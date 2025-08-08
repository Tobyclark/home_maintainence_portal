const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite', // Path to your SQLite file
  logging: false
});

module.exports = sequelize;