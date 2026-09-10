const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Notification = sequelize.define(
    "Notification",
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
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        senderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        referenceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
      {
    tableName: "Notifications",
    timestamps: true,
  }
);

module.exports = Notification;