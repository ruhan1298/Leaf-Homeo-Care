const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Coupon = sequelize.define(
  "Coupon",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 50],
      },
    },

    discountType: {
      type: DataTypes.ENUM("fixed", "percentage"),
      allowNull: false,
      defaultValue: "percentage",
    },

    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },

    expireTime: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
      },
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "coupons",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["code"],
      },
      {
        fields: ["isActive"],
      },
      {
        fields: ["expireTime"],
      },
    ],
  }
);

module.exports = Coupon;