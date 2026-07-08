const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const Doctor = require("../../models/Doctor");
const Appointment = require("../../models/Appointment");
const Patient = require("../../models/Patient");

const { Op } = require("sequelize");
const nodemailer = require("nodemailer");
const JWT_SECRET = process.env.JWT_SECRET;
exports.GetAppointments = async (req, res, next) => {
  try {
    // 1. Fixing page variable query bug (req.body.age -> req.body.page)
    const page = parseInt(req.body.page) || 1; 
    const limit = parseInt(req.body.limit) || 10;
    const search = req.body.search ? req.body.search.trim() : "";
    const offset = (page - 1) * limit;

    const { count, rows } = await Appointment.findAndCountAll({
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: ["id", "gender", "dob"], // Patient specific fields
          include: [
            {
              model: User,
              as: "user", // Sahi alias: Aapke Patient.belongsTo(User, { as: "user" }) se matched
              attributes: ["id", "name", "mobile", "email"],
            },
          ],
        },
        {
          model: Doctor,
          as: "doctor",
          attributes: ["id", "specialization"], // Doctor specific fields
          include: [
            {
              model: User,
              as: "user", // Sahi alias: Aapke Doctor.belongsTo(User, { as: "user" }) se matched
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      // 2. Dynamic Search Path adjusted as per your exact aliases
      where: search
        ? {
            [Op.or]: [
              { "$patient.user.name$": { [Op.iLike]: `%${search}%` } },
              { "$patient.user.mobile$": { [Op.iLike]: `%${search}%` } },
              { "$doctor.user.name$": { [Op.iLike]: `%${search}%` } },
            ],
          }
        : undefined,
      order: [["appointmentDateTime", "DESC"]],
      limit,
      offset,
      distinct: true,
      subQuery: false,
    });

    const totalRecords = count;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    // 3. Clean Response Format for Admin Dashboard
    const appointments = rows.map((appt) => ({
      id: appt.id,
      appointmentDate: appt.appointmentDate,
      status: appt.status,
      patient: appt.patient && appt.patient.user
        ? {
            id: appt.patient.id,
            name: appt.patient.user.name,
            gender: appt.patient.gender,
            dob: appt.patient.dob,
            mobile: appt.patient.user.mobile,
            email: appt.patient.user.email,
          }
        : null,
      doctor: appt.doctor && appt.doctor.user
        ? {
            id: appt.doctor.id,
            name: appt.doctor.user.name,
            specialization: appt.doctor.specialization,
          }
        : null,
    }));

    return res.status(200).json({
      status: 1,
      message: "Appointments fetched successfully",
      data: {
        appointments,
        totalRecords,
        totalPages,
        currentPage: page,
      },
    });
  } catch (error) {
    console.error("Error in GetAppointments: ", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong while fetching appointments",
    });
  }
};

