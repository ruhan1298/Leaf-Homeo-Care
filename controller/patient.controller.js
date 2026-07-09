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
    console.log("Expert Doctors:", expertDoctors); // Log the fetched data for debugging

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

exports.updatePatient = async (req, res, next) => {
  try {
    const { patientId, name, email, mobile, gender, dob, houseNumber, addressLine1, addressLine2, landmark, city, state, pincode, country } = req.body;

    const patient = await Patient.findByPk(patientId, {
      include: [
        {
          model: User,
          as: "user",
        },
      ],
    });

    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient not found",
      });
    }

    // Update User fields
    if (name) patient.user.name = name;
    if (email) patient.user.email = email;
    if (mobile) patient.user.mobile = mobile;

    await patient.user.save();

    // Update Patient fields
    if (gender !== undefined) patient.gender = gender;
    if (dob !== undefined) patient.dob = dob;
    if (houseNumber !== undefined) patient.houseNumber = houseNumber;
    if (addressLine1 !== undefined) patient.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) patient.addressLine2 = addressLine2;
    if (landmark !== undefined) patient.landmark = landmark;
    if (city !== undefined) patient.city = city;
    if (state !== undefined) patient.state = state;
    if (pincode !== undefined) patient.pincode = pincode;
    if (country !== undefined) patient.country = country;

    await patient.save();

    return res.status(200).json({
      status: 1,
      message: "Patient updated successfully",
      data: {
        ...patient.toJSON(),
        user: patient.user.toJSON(),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

exports.getPatientProfile = async (req, res, next) => {
  try {
    const { patientId } = req.body;

    const patient = await Patient.findByPk(patientId, {
      include: [
        {
          model: User,
          as: "user",
        },
      ],
    });

    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient not found",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Patient profile fetched successfully",
      data: {
        ...patient.toJSON(),
        user: patient.user.toJSON(),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

exports.deletePatient = async (req, res, next) => {
  try {
    const { patientId } = req.body;

    const patient = await Patient.findByPk(patientId, {
      include: [
        {
          model: User,
          as: "user",
        },
      ],
    });

    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient not found",
      });
    }

    // Delete the associated user
    await patient.user.destroy();

    return res.status(200).json({
      status: 1,
      message: "Patient deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};
