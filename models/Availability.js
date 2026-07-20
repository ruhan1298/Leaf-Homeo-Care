const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Availability = sequelize.define(
  "Availability",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    dayOfWeek: {
      type: DataTypes.ENUM(
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday"
      ),
      allowNull: false,
    },
    startTime: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Time slot in HH:MM format (e.g., 09:00, 09:30)",
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "availabilities",
    timestamps: true,
  }
);

module.exports = Availability;
