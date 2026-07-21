const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Appointment = sequelize.define(
  "Appointment",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
        appointmentId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },


    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: true, // any_doctor case me null rahega
    },

    requestType: {
      type: DataTypes.ENUM(
        "any_doctor",
        "specific_doctor"
      ),
      allowNull: false,
    },

    appointmentDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(
        "pending",
        "accepted",
        "rejected",
        "payment_pending",
        "paid",
        "completed",
        "cancelled"
      ),
      defaultValue: "pending",
    },

    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    roomName:{
      type:DataTypes.STRING,
      allowNull:true 
    }
  },
  {
    tableName: "appointments",
    timestamps: true,
  }
);

module.exports = Appointment;