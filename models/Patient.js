const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Patient = sequelize.define(
  "Patient",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    gender: {
      type: DataTypes.ENUM("male", "female", "other"),
      allowNull: true,
    },

    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    houseNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    addressLine1: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    addressLine2: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    landmark: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    pincode: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    IsCompleteProfile: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },




  {
    tableName: "patients",
    timestamps: true,
  }
);

module.exports = Patient;