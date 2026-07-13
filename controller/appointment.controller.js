const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Doctor, Patient,Appointment,Payment, Availability } = require("../models");
const { Op } = require("sequelize");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const JWT_SECRET = process.env.JWT_SECRET;
const Sequelize = require("sequelize");
const Notification = require("../models/Notification");

exports.AvailabilitySlots = async (req,res,next ) =>{
  try {
    const { doctorId, date } = req.body;
    if (!doctorId || !date) {
      return res.status(400).json({
        status: 0,
        message: "doctorId and date are required"
      });
    }

    // Validate doctor exists
    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) {
      return res.status(404).json({
        status: 0,
        message: "Doctor not found"
      });
    }

    // Validate date format
    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({
        status: 0,
        message: "Invalid date format"
      });
    }

    const dayOfWeek = selectedDate
      .toLocaleDateString("en-US", {
        weekday: "long",
      })
      .toLowerCase();

    const availability = await Availability.findAll({
      where: {
        doctorId,
        dayOfWeek,
        IsAvailable: true
      }
    });

    if (!availability.length) {
      return res.status(200).json({
        status: 1,
        slots: []
      });
    }

    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${date} 23:59:59`;

    const appointments = await Appointment.findAll({
      where: {
        doctorId,
        status: {
          [Op.notIn]: ["cancelled"]
        },
        appointmentDateTime: {
          [Op.between]: [startOfDay, endOfDay]
        }
      }
    });

    const bookedSlots = appointments.map((a) => {

      const d = new Date(a.appointmentDateTime);

      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      });

    });

    const slots = [];

    availability.forEach((item) => {

      let current = new Date(
        `2000-01-01T${item.startTime}`
      );

      const end = new Date(
        `2000-01-01T${item.endTime}`
      );

      while (current < end) {

        const slot = current.toLocaleTimeString(
          "en-GB",
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        );

        slots.push({
          time: slot,
          available: !bookedSlots.includes(slot)
        });

        current.setMinutes(
          current.getMinutes() +
          item.slotDuration
        );

      }

    });

    return res.status(200).json({
      status: 1,
      date,
      dayOfWeek,
      slots
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      status: 0,
      message: error.message
    });

  }

}
exports.AppointmentBooking = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log("Patient ID from token:", userId); // Log the patient ID for debugging

    const patient = await Patient.findOne({
      where: {
        userId
      }
    });

    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient profile not found"
      });
    }

    const patientId = patient.id;


    const { doctorId, requestType,appointmentDateTime ,reason} = req.body;
    console.log("Request Body:", req.body); // Log the request body for debugging
   if ( !requestType || !appointmentDateTime) {
      return res.status(400).json({
        status: 0,
        message: "Required fields are missing",
      });
    }
    if (requestType === "specific_doctor" && !doctorId) {
      return res.status(400).json({
        status: 0,
        message: "Doctor ID is required for specific doctor request",
      });
    }

    // Validate doctor exists for specific_doctor requests
    if (requestType === "specific_doctor") {
      const doctor = await Doctor.findByPk(doctorId);
      if (!doctor) {
        return res.status(404).json({
          status: 0,
          message: "Doctor not found",
        });
      }
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId: requestType === "specific_doctor" ? doctorId : null,
        requestType,
        appointmentDateTime,
        reason,
    });
if(requestType === "specific_doctor") {
      // Send notification to the specific doctor
      const doctor = await Doctor.findByPk(doctorId);
await Notification.create({
        userId: doctor.userId,
        senderId: userId,

        title: "New Appointment Request",

        message:
          "You have received a new appointment request.",

        type: "appointment",

        referenceId: appointment.id,
      });

    }

    if (requestType === "any_doctor") {
      // Send notification to all expert doctors
   const doctors = await Doctor.findAll({
        attributes: ["userId"],
      });
      const notifications = doctors.map((doctor) => ({
        userId: doctor.userId,

        senderId: userId,

        title: "New Appointment Request",

        message:
          "A patient has requested a consultation.",

        type: "appointment",

        referenceId: appointment.id,

        isRead: false,
      }));

      await Notification.bulkCreate(
        notifications
      );

    }
return res.status(201).json({
      status: 1,

      message:
        "Appointment booked successfully",

      data: appointment,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });

  }
};        

exports.UpcomingAppointments = async (req, res) => {
  try {

    const userId = req.user.id;

    const patient = await Patient.findOne({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient profile not found",
      });
    }

    const appointments = await Appointment.findAll({

      where: {

        patientId: patient.id,

        appointmentDateTime: {
          [Op.gte]: new Date(),
        },

        status: {
          [Op.notIn]: [
            "cancelled",
            "completed",
            "rejected",
            "pending"
          ]
        }

      },

      include: [

        {

          model: Doctor,

          as: "doctor",

          attributes: [

            "id",
            "specialization",
            "experience",
            "qualification",
            "consultationFee"

          ],

          include: [

            {

              model: User,

              as: "user",

              attributes: [

                "name",
                "image"

              ]

            }

          ]

        }

      ],

      order: [

        ["appointmentDateTime", "ASC"]

      ]

    });

    const data = appointments.map(item => ({

      appointmentId:
        item.id,

      appointmentDateTime:
        item.appointmentDateTime,

      status:
        item.status,

      acceptedAt:
        item.acceptedAt,

      reason:
        item.reason,

      doctorId:
        item.doctor?.id,

      doctorName:
        item.doctor?.user?.name,

      doctorImage:
        item.doctor?.user?.image,

      specialization:
        item.doctor?.specialization,

      experience:
        item.doctor?.experience,

      qualification:
        item.doctor?.qualification,

      consultationFee:
        item.doctor?.consultationFee

    }));

    return res.status(200).json({

      status: 1,

      message:
        "Upcoming appointments retrieved successfully",

      data

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
exports.myAppointments = async (req, res) => {
  try {
    const userId = req.user.id;

    const patient = await Patient.findOne({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient profile not found"
      });
    }

    const appointments = await Appointment.findAll({
      where: {
        patientId: patient.id
      },

      attributes: [
        "id",
        "status",
        "appointmentDateTime"
      ],

      include: [
        {
          model: Doctor,
          as: "doctor",
          attributes: ["id"],

          include: [
            {
              model: User,
              as: "user",
              attributes: [
                "name",
                "image"
              ]
            }
          ]
        }
      ],

      order: [
        ["appointmentDateTime", "DESC"]
      ]
    });

    const result = appointments.map(item => ({
      id: item.id,
      doctorName: item.doctor?.user?.name,
      doctorImage: item.doctor?.user?.image,
      status: item.status,
      appointmentDateTime: item.appointmentDateTime
    }));

    return res.status(200).json({
      status: 1,
      message: "Appointments fetched successfully",
      data: result
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
      error: error.message
    });
  }
};
exports.CancelAppointment = async (req, res) => {
  try {
    const userId = req.user.id;

    const { appointmentId } = req.body;

    const patient = await Patient.findOne({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient profile not found"
      });
    }

    const appointment = await Appointment.findByPk(
      appointmentId,
      {
        include: [
          {
            model: Doctor,
            as: "doctor",
            attributes: ["userId"]
          }
        ]
      }
    );
    console.log(appointment,"appointment");

    if (!appointment) {
      return res.status(404).json({
        status: 0,
        message: "Appointment not found"
      });
    }

    // Authorization check - patient can only cancel their own appointments
    if (appointment.patientId !== patient.id) {
      return res.status(403).json({
        status: 0,
        message: "Unauthorized access"
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        status: 0,
        message: "Appointment is already cancelled"
      });
    }
    await appointment.update({ status: "cancelled" });

    // Send notification to the doctor
    await Notification.create({
      userId: appointment.doctor.userId,
      senderId: req.user.id,
      title: "Appointment Cancelled",
      message: "A patient has cancelled their appointment.",
      type: "appointment",
      referenceId: appointment.id,

    });


    return res.status(200).json({
      status: 1,
      message: "Appointment cancelled successfully",
      data: appointment
    });



    




  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
}