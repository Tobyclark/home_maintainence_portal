const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Record = sequelize.define('Record', {
  category: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  company: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  notes: { type: DataTypes.TEXT },
  pdf: { type: DataTypes.STRING },
  pdfData: { type: DataTypes.BLOB }
});

module.exports = Record;
