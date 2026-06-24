const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Doctor = sequelize.define(
  "Doctor",
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

    specialization: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    qualification: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    experience: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    consultationFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    IsExpert:{
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }
  },
  {
    tableName: "doctors",
    timestamps: true,
  }
);

module.exports = Doctor;