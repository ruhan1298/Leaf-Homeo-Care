const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Consultation = sequelize.define(
  "Consultation",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    appointmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "appointments",
        key: "id",
      },
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "doctors",
        key: "id",
      },
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "patients",
        key: "id",
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    prescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    followUpDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    callDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Duration in seconds",
    },
    pdfGenerated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    pdfPath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "consultations",
    timestamps: true,
  }
);

module.exports = Consultation;
