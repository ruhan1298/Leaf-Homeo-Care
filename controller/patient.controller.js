const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Doctor, Patient,Appointment,Payment } = require("../models");
const { Op } = require("sequelize");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const JWT_SECRET = process.env.JWT_SECRET;
const Sequelize = require("sequelize");

exports.ExpertDoctors = async (req, res, next) => {
  try {
    const expertDoctors = await Doctor.findAll({
      where: {
        IsExpert: true,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: [],
        },
      ],
      attributes: [
        "id",
        "specialization",
        "experience",
        "qualification",
        "consultationFee",
        [Sequelize.col("user.name"), "name"],
        [Sequelize.col("user.image"), "image"],
      ],
    });

    return res.status(200).json({
      status: 1,
      message: "Expert doctors fetched successfully",
      data: expertDoctors,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};
exports.DoctorDetails = async (req, res, next) => {
  try {
    const { doctorId } = req.body;

    const doctor = await Doctor.findByPk(doctorId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "image"],
        },
      ],
    });

    if (!doctor) {
      return res.status(404).json({
        status: 0,
        message: "Doctor not found",
      });
    }

    const data = {
      ...doctor.toJSON(),
      name: doctor.user?.name,
      image: doctor.user?.image,
    };

    delete data.user;

    return res.status(200).json({
      status: 1,
      message: "Doctor details fetched successfully",
      data,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

