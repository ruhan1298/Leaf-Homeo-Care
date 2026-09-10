const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    appointmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Final amount after discount",
    },

    originalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Original amount before discount",
    },

    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: "Discount amount applied",
    },

    couponId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "coupons",
        key: "id",
      },
    },

    currency: {
      type: DataTypes.STRING,
      defaultValue: "INR",
    },

    paymentId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

      signature: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    //     paymentId: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
       orderId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    gateway: {
      type: DataTypes.STRING,
      defaultValue: "razorpay",
    },

    status: {
      type: DataTypes.ENUM(
        "pending",
        "paid",
        "failed",
        "refunded"
      ),
      defaultValue: "pending",
    },

    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "payments",
    timestamps: true,
  }
);

module.exports = Payment;