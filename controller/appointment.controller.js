const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Doctor, Patient,Appointment,Payment, Availability } = require("../models");
const { Op } = require("sequelize");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const JWT_SECRET = process.env.JWT_SECRET;
const Sequelize = require("sequelize");
const twilio = require('twilio');
const { AccessToken } = twilio.jwt;
const { VideoGrant } = AccessToken;
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
            "userId",
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

      doctorUserId:
        item.doctor?.userId,

      doctorName:
        item.doctor?.user?.name,

      doctorImage:
        item.doctor?.user?.image ? `http://localhost:5000/uploads/${item.doctor?.user?.image}` : null,

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
          attributes: ["id", "userId"],

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
      doctorUserId: item.doctor?.userId,
      doctorName: item.doctor?.user?.name,
      doctorImage: item.doctor?.user?.image ? `http://localhost:5000/uploads/${item.doctor?.user?.image}` : null,
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
      where: { userId },
    });

    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient profile not found",
      });
    }

    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        {
          model: Doctor,
          as: "doctor",
          attributes: ["userId"],
        },
      ],
    });

    if (!appointment) {
      return res.status(404).json({
        status: 0,
        message: "Appointment not found",
      });
    }

    // Patient can cancel only their own appointment
    if (appointment.patientId !== patient.id) {
      return res.status(403).json({
        status: 0,
        message: "Unauthorized access",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        status: 0,
        message: "Appointment is already cancelled",
      });
    }

    // Update appointment status
    await appointment.update({
      status: "cancelled",
    });

    // Notify doctor only if a doctor is assigned
    if (appointment.doctor?.userId) {
      await Notification.create({
        userId: appointment.doctor.userId,
        senderId: req.user.id,
        title: "Appointment Cancelled",
        message: "A patient has cancelled their appointment.",
        type: "appointment",
        referenceId: appointment.id,
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Appointment cancelled successfully",
      data: appointment,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
      error: error.message,
    });
  }
};
exports.GetVideoToken = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    console.log("GetVideoToken called with appointmentId:", appointmentId);

    if (!appointmentId) {
      return res.status(400).json({
        status: 0,
        message: "appointmentId is required."
      });
    }

    // Retrieve the appointment along with patient & doctor user references
    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        { model: Patient, as: "patient", attributes: ["id", "userId"] },
        { model: Doctor, as: "doctor", attributes: ["id", "userId"] }
      ]
    });

    console.log("Appointment found:", appointment ? "Yes" : "No");
    console.log("Appointment status:", appointment?.status);
    console.log("Room name:", appointment?.roomName);

    // Validate that the appointment exists and is accepted
    if (!appointment || appointment.status !== 'paid') {
      return res.status(403).json({
        status: 0,
        message: "Video call access is not permitted for this appointment."
      });
    }

    // Verify the requesting user is either the patient or the doctor
    const userId = req.user.id;
    const isPatient = appointment.patient && appointment.patient.userId === userId;
    const isDoctor = appointment.doctor && appointment.doctor.userId === userId;

    console.log("User ID:", userId);
    console.log("Is patient:", isPatient);
    console.log("Is doctor:", isDoctor);

    if (!isPatient && !isDoctor) {
      return res.status(403).json({
        status: 0,
        message: "You are not authorized to join this call."
      });
    }

    // Ensure room exists
    if (!appointment.roomName) {
      return res.status(400).json({
        status: 0,
        message: "Room not found for this appointment."
      });
    }

    console.log("Twilio credentials check:");
    console.log("Account SID:", process.env.TWILIO_ACCOUNT_SID ? "Set" : "Not set");
    console.log("API Key:", process.env.TWILIO_API_KEY ? "Set" : "Not set");
    console.log("API Secret:", process.env.TWILIO_API_SECRET ? "Set" : "Not set");
    console.log("Room name for token:", appointment.roomName);
    console.log("Requesting User ID:", userId);
    console.log("Patient ID:", appointment.patientId);
    console.log("Patient User ID:", appointment.patient?.userId);
    console.log("Doctor ID:", appointment.doctorId);
    console.log("Doctor User ID:", appointment.doctor?.userId);
    console.log("User role:", isDoctor ? "doctor" : "patient");

    // Create unique identity based on role and actual appointment IDs (not JWT user ID)
    // This prevents issues when testing with same browser/session
    const uniqueIdentity = isDoctor 
      ? `doctor_${appointment.doctorId}` 
      : `patient_${appointment.patientId}`;
    
    console.log("Unique identity for token:", uniqueIdentity);

    // Create the Twilio Access Token with enhanced configuration
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { 
        identity: uniqueIdentity,
        ttl: 3600 // 1 hour expiry
      }
    );

    // Grant access to the specific room created during acceptance
    const videoGrant = new VideoGrant({
      room: appointment.roomName
    });
    token.addGrant(videoGrant);

    const jwtToken = token.toJwt();
    console.log("Token generated successfully for room:", appointment.roomName);

    // Return the token and room name to the frontend
    return res.status(200).json({
      status: 1,
      message: "Token generated successfully.",
      data: {
        token: jwtToken,
        roomName: appointment.roomName,
        role: isDoctor ? "doctor" : "patient",
        identity: uniqueIdentity
      }
    });

  } catch (error) {
    console.error("Error generating video token:", error);
    return res.status(500).json({
      status: 0,
      message: "Internal server error occurred while generating token."
    });
  }
};

exports.EndVideoCall = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const userId = req.user.id;

    if (!appointmentId) {
      return res.status(400).json({
        status: 0,
        message: "appointmentId is required."
      });
    }

    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        { model: Patient, as: "patient", attributes: ["id", "userId"] },
        { model: Doctor, as: "doctor", attributes: ["id", "userId"] }
      ]
    });

    if (!appointment) {
      return res.status(404).json({
        status: 0,
        message: "Appointment not found."
      });
    }

    // Verify authorization
    const isPatient = appointment.patient && appointment.patient.userId === userId;
    const isDoctor = appointment.doctor && appointment.doctor.userId === userId;

    if (!isPatient && !isDoctor) {
      return res.status(403).json({
        status: 0,
        message: "You are not authorized to end this call."
      });
    }

    // Complete the appointment
    appointment.status = 'completed';
    appointment.completedAt = new Date();
    await appointment.save();

    // Clean up Twilio room (optional - rooms auto-expire)
    try {
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const room = await twilioClient.video.rooms(appointment.roomName).fetch();
      
      // Only complete the room if both participants have left
      if (room && room.status === 'in-progress' && room.participants.size === 0) {
        await twilioClient.video.rooms(appointment.roomName).update({ status: 'completed' });
        console.log(`Twilio room ${appointment.roomName} completed`);
      }
    } catch (roomError) {
      console.log('Room cleanup note:', roomError.message);
      // Don't fail the request if room cleanup fails
    }

    return res.status(200).json({
      status: 1,
      message: "Video call ended successfully.",
      data: appointment
    });

  } catch (error) {
    console.error("Error ending video call:", error);
    return res.status(500).json({
      status: 0,
      message: "Internal server error occurred while ending call."
    });
  }
};