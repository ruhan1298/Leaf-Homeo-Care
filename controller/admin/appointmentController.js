const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const Doctor = require("../../models/Doctor");
const Appointment = require("../../models/Appointment");
const Patient = require("../../models/Patient");
const Payment = require("../../models/Payment");

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
          attributes: ["id", "gender", "dob", "houseNumber", "addressLine1", "addressLine2", "landmark", "city", "state", "pincode", "country"], // Patient specific fields
          include: [
            {
              model: User,
              as: "user", // Sahi alias: Aapke Patient.belongsTo(User, { as: "user" }) se matched
              attributes: ["id", "name", "mobile", "email", "image"],
            },
          ],
        },
        {
          model: Doctor,
          as: "doctor",
          attributes: ["id", "specialization", "qualification", "experience", "consultationFee", "bio"], // Doctor specific fields
          include: [
            {
              model: User,
              as: "user", // Sahi alias: Aapke Doctor.belongsTo(User, { as: "user" }) se matched
              attributes: ["id", "name", "image"],
            },
          ],
        },
        {
          model: Payment,
          as: "payment",
          attributes: ["id", "amount", "transactionId", "gateway", "status", "paidAt"],
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
      appointmentDate: appt.appointmentDateTime,
      notes: appt.reason,
      reason: appt.reason,
      status: appt.status,
      requestType: appt.requestType,
      patient: appt.patient && appt.patient.user
        ? {
            id: appt.patient.id,
            name: appt.patient.user.name,
            gender: appt.patient.gender,
            dob: appt.patient.dob,
            mobile: appt.patient.user.mobile,
            email: appt.patient.user.email,
            image: appt.patient.user.image,
            houseNumber: appt.patient.houseNumber,
            addressLine1: appt.patient.addressLine1,
            addressLine2: appt.patient.addressLine2,
            landmark: appt.patient.landmark,
            city: appt.patient.city,
            state: appt.patient.state,
            pincode: appt.patient.pincode,
            country: appt.patient.country,
          }
        : null,
      doctor: appt.doctor && appt.doctor.user
        ? {
            id: appt.doctor.id,
            name: appt.doctor.user.name,
            specialization: appt.doctor.specialization,
            qualification: appt.doctor.qualification,
            experience: appt.doctor.experience,
            consultationFee: appt.doctor.consultationFee,
            bio: appt.doctor.bio,
            image: appt.doctor.user.image,
          }
        : null,
      payment: appt.payment
        ? {
            id: appt.payment.id,
            amount: appt.payment.amount,
            transactionId: appt.payment.transactionId,
            gateway: appt.payment.gateway,
            status: appt.payment.status,
            paidAt: appt.payment.paidAt,
          }
        : null,
    }));
    console.log(appointments,"appointmenT");
  
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

