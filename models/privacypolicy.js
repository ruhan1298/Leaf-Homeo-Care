const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PrivacyPolicy = sequelize.define(
  "PrivacyPolicy",
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
    tableName: "PrivacyPolicy",
    timestamps: true,
  }
);

module.exports = PrivacyPolicy;