const Notification = require("../../models/Notification");
const { Op } = require("sequelize");
const nodemailer = require("nodemailer");
const JWT_SECRET = process.env.JWT_SECRET;
const Sequelize = require("sequelize");

const { User, Doctor, Patient, Appointment, Payment ,Availability} = require("../../models");


exports.AddAvailability = async (req, res) => {
  try {

    const userId = req.user.id;

    const doctor = await Doctor.findOne({
      where: {
        userId
      }
    });

    if (!doctor) {
      return res.status(404).json({
        status: 0,
        message: "Doctor not found"
      });
    }

    const { availability } = req.body;

    if (!availability || !Array.isArray(availability)) {
      return res.status(400).json({
        status: 0,
        message: "Availability array is required"
      });
    }

    const availabilityData = availability.map(item => ({
      doctorId: doctor.id,
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      slotDuration: item.slotDuration || 30,
      IsAvailable: true
    }));

    const result = await Availability.bulkCreate(
      availabilityData
    );

    return res.status(201).json({
      status: 1,
      message: "Availability added successfully",
      data: result
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });

  }
};
exports.AcceptAppointment = async (req, res) => {
  try {

    const { appointmentId } = req.body;

    const userId = req.user.id;

    const doctor = await Doctor.findOne({
      where: { userId }
    });

    if (!doctor) {
      return res.status(404).json({
        status: 0,
        message: "Doctor not found"
      });
    }

    const appointment = await Appointment.findByPk(
      appointmentId
    );

    if (!appointment) {
      return res.status(404).json({
        status: 0,
        message: "Appointment not found"
      });
    }

    if (appointment.status !== "pending") {
      return res.status(400).json({
        status: 0,
        message:
          "Appointment already processed"
      });
    }

    // specific doctor validation
    if (
      appointment.requestType ===
      "specific_doctor"
    ) {

      if (
        appointment.doctorId !== doctor.id
      ) {

        return res.status(403).json({

          status: 0,

          message:
            "You cannot accept this appointment"

        });

      }

    }

    // any doctor assignment
    if (
      appointment.requestType ===
      "any_doctor"
    ) {

      appointment.doctorId =
        doctor.id;

    }

    appointment.status =
      "accepted";

    appointment.acceptedAt =
      new Date();

    await appointment.save();

    await Notification.create({

      userId:
        appointment.patientId,

      senderId:
        userId,

      title:
        "Appointment Accepted",

      message:
        "Your appointment has been accepted.",

      type:
        "appointment",

      referenceId:
        appointment.id

    });

    return res.status(200).json({

      status: 1,

      message:
        "Appointment accepted successfully",

      data:
        appointment

    });

  }

  catch (error) {

    console.log(error);

    return res.status(500).json({

      status: 0,

      message:
        "Something went wrong"

    });

  }

};