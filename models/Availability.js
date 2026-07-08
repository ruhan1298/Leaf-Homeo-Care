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
      type: DataTypes.TIME,
      allowNull: false, 
  },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    slotDuration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30, // Default slot duration in minutes
    },
    IsAvailable: { 

        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
},
{
    tableName: "availabilities",
    timestamps: true,
  }
);
module.exports = Availability

    
   
