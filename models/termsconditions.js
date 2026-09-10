const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TermsConditions = sequelize.define(
  "TermsConditions",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

  },

  {
    tableName: "TermsConditions",
    timestamps: true,
  }
);

module.exports = TermsConditions;
