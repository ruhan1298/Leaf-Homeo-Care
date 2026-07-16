const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ChatMessage = sequelize.define(
  "ChatMessage",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    messageType: {
      type: DataTypes.ENUM('text', 'symptom_report', 'prescription', 'appointment_reminder', 'lab_result'),
      defaultValue: 'text',
      allowNull: false,
    },

    medicalData: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    attachmentUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    attachmentType: {
      type: DataTypes.ENUM('image', 'document', 'video', 'audio'),
      allowNull: true,
    },

    attachmentName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    attachmentSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "chat_messages",
    timestamps: true,
  }
);

module.exports = ChatMessage;
