const Notification = require("../../models/Notification");
const { Op } = require("sequelize");
const nodemailer = require("nodemailer");
const JWT_SECRET = process.env.JWT_SECRET;
const Sequelize = require("sequelize");
const twilio = require('twilio');
const admin = require("../../config/firebase")

const { User, Doctor, Patient, Appointment, Payment ,Availability} = require("../../models");


exports.AddAvailability = async (req, res) => {
  try {
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

    const { availability } = req.body;

    if (!availability || !Array.isArray(availability)) {
      return res.status(400).json({
        status: 0,
        message: "Availability array is required"
      });
    }

    // Process each day's availability
    const availabilityData = [];
    for (const item of availability) {
      if (!item.dayOfWeek || !item.slots || !Array.isArray(item.slots)) {
        continue;
      }

      // Delete existing slots for this day and doctor
      await Availability.destroy({
        where: {
          doctorId: doctor.id,
          dayOfWeek: item.dayOfWeek
        }
      });

      // Create new slots
      const slots = item.slots.map(slot => ({
        doctorId: doctor.id,
        dayOfWeek: item.dayOfWeek,
        startTime: slot,
        isAvailable: true
      }));
      availabilityData.push(...slots);
    }

    const result = await Availability.bulkCreate(availabilityData);

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
    console.log(req.body,"BODY");


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
    console.log(appointment,"APPOINRMENR");


    if (!appointment) {
      return res.status(404).json({
        status: 0,
        message: "Appointment not found"
      });
    }

    // Authorization check - doctor can only accept appointments assigned to them or any_doctor requests
    if (appointment.requestType === "specific_doctor" && appointment.doctorId !== doctor.id) {
      return res.status(403).json({
        status: 0,
        message: "You cannot accept this appointment"
      });
    }

    if (appointment.status !== "pending") {
      return res.status(400).json({
        status: 0,
        message:
          "Appointment already processed"
      });
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

appointment.roomName = `room_${appointmentId}_${Date.now()}`;
    
    // Create Twilio video room with enhanced configuration
    try {
      // Verify Twilio credentials are set
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.error('Twilio credentials not configured');
        return res.status(500).json({
          status: 0,
          message: 'Twilio credentials not configured. Please check your environment variables.'
        });
      }

      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      // Check if room already exists (prevent duplicates)
      try {
        await twilioClient.video.rooms(appointment.roomName).fetch();
        console.log(`Room ${appointment.roomName} already exists, using existing room`);
      } catch (fetchError) {
        // Room doesn't exist, create new one
        if (fetchError.code === 20404) {
          await twilioClient.video.rooms.create({
            uniqueName: appointment.roomName,
            type: 'group',
            enableTurn: true,
            maxParticipants: 2,
            recordParticipantsOnConnect: false
          });
          console.log(`Twilio room created: ${appointment.roomName}`);
        } else {
          console.error('Error fetching Twilio room:', fetchError);
          throw fetchError;
        }
      }
    } catch (twilioError) {
      console.error('Error managing Twilio room:', twilioError);
      if (twilioError.code === 20003) {
        return res.status(500).json({
          status: 0,
          message: 'Invalid Twilio credentials. Please check your account SID and auth token.'
        });
      } else if (twilioError.code === 20005) {
        return res.status(500).json({
          status: 0,
          message: 'Twilio account does not have video permissions enabled.'
        });
      } else {
        return res.status(500).json({
          status: 0,
          message: `Failed to create video room: ${twilioError.message || 'Unknown error'}`
        });
      }
    }
    
    await appointment.save();

const patient = await Patient.findByPk(appointment.patientId);
console.log(patient, "PATIENT");
const doctorUser = await User.findByPk(doctor.userId);


const notification = await Notification.create({
  userId: patient.userId,
  senderId: doctor.userId,
  title: "Appointment Accepted",
  message: `Dr. ${doctorUser.name} has accepted your appointment. Please complete your payment to confirm your consultation.`,
  type: "appointment",
  referenceId: appointment.id
});

console.log(notification, "NOTIFICATION CREATED");
const patientUser = await User.findByPk(patient.userId);
console.log(doctorUser,"USER");



if (patientUser && patientUser.fcmToken) {
  try {
    await admin.messaging().send({
      token: patientUser.fcmToken,
     notification: {
        title: "Appointment Confirmed",
        body: `Dr. ${doctorUser.name} has accepted your appointment. Please complete your payment to confirm your consultation.`,
      },
    });

    console.log("Push notification sent successfully");
  } catch (err) {
    console.error("FCM Error:", err.message);
  }
}

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

exports.RejectAppointment = async (req, res) => {
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

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        status: 0,
        message: "Appointment not found"
      });
    }

    // Authorization check
    if (appointment.requestType === "specific_doctor" && appointment.doctorId !== doctor.id) {
      return res.status(403).json({
        status: 0,
        message: "You cannot reject this appointment"
      });
    }

    if (appointment.status !== "pending") {
      return res.status(400).json({
        status: 0,
        message: "Appointment already processed"
      });
    }

    appointment.status = "rejected";
    await appointment.save();

    // Send notification to patient
    const patient = await Patient.findByPk(appointment.patientId);
    if (patient) {
      await Notification.create({
        userId: patient.userId,
        senderId: doctor.userId,
        title: "Appointment Rejected",
        message: "Your appointment has been rejected.",
        type: "appointment",
        referenceId: appointment.id
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Appointment rejected successfully",
      data: appointment
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });
  }
};

exports.GetDoctorAvailability = async (req, res) => {
  try {
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

    const availability = await Availability.findAll({
      where: { doctorId: doctor.id, isAvailable: true },
      order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
    });

    // Group by day of week
    const availabilityMap = {};
    availability.forEach(slot => {
      if (!availabilityMap[slot.dayOfWeek]) {
        availabilityMap[slot.dayOfWeek] = [];
      }
      availabilityMap[slot.dayOfWeek].push(slot.startTime);
    });

    return res.status(200).json({
      status: 1,
      message: "Availability fetched successfully",
      data: availabilityMap
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });
  }
};

exports.UpdateAvailability = async (req, res) => {
  try {
    const { availabilityId, isAvailable } = req.body;
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

    const availability = await Availability.findOne({
      where: { id: availabilityId, doctorId: doctor.id }
    });

    if (!availability) {
      return res.status(404).json({
        status: 0,
        message: "Availability not found"
      });
    }

    if (isAvailable !== undefined) availability.isAvailable = isAvailable;

    await availability.save();

    return res.status(200).json({
      status: 1,
      message: "Availability updated successfully",
      data: availability
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });
  }
};

exports.DeleteAvailability = async (req, res) => {
  try {
    const { availabilityId } = req.body;
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

    const availability = await Availability.findOne({
      where: { id: availabilityId, doctorId: doctor.id }
    });

    if (!availability) {
      return res.status(404).json({
        status: 0,
        message: "Availability not found"
      });
    }

    await availability.destroy();

    return res.status(200).json({
      status: 1,
      message: "Availability deleted successfully"
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });
  }
};

exports.GetDoctorAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;

    const doctor = await Doctor.findOne({
      where: { userId }
    });

    if (!doctor) {
      return res.status(404).json({
        status: 0,
        message: "Doctor not found"
      });
    }

    // Include both assigned appointments and any_doctor requests
    const whereClause = {
      [Op.or]: [
        { doctorId: doctor.id },
        { 
          doctorId: null,
          requestType: "any_doctor"
        }
      ]
    };

    if (status && status !== "all") {
      whereClause.status = status;
    }

    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: ["id", "userId"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["name", "image", "email", "mobile"]
            }
          ]
        }
      ],
      order: [["appointmentDateTime", "DESC"]]
    });

    const data = appointments.map(apt => ({
      id: apt.id,
      patientId: apt.patientId,
      patientUserId: apt.patient?.userId,
      patientName: apt.patient?.user?.name,
      patientImage: apt.patient?.user?.image ? `http://localhost:5000/${apt.patient?.user?.image}` : null,
      patientEmail: apt.patient?.user?.email,
      patientPhone: apt.patient?.user?.mobile,
      appointmentDateTime: apt.appointmentDateTime,
      status: apt.status,
      reason: apt.reason,
      requestType: apt.requestType,
      acceptedAt: apt.acceptedAt
    }));

    return res.status(200).json({
      status: 1,
      message: "Appointments fetched successfully",
      data
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });
  }
};

exports.GetDoctorPatients = async (req, res) => {
  try {
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

    const appointments = await Appointment.findAll({
      where: { doctorId: doctor.id },
      attributes: ["patientId"],
      group: ["patientId"]
    });

    const patientIds = [...new Set(appointments.map(a => a.patientId))];

    const patients = await Patient.findAll({
      where: { id: { [Op.in]: patientIds } },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "mobile", "image"]
        }
      ]
    });

    const data = patients.map(p => ({
      id: p.id,
      userId: p.userId,
      name: p.user?.name,
      email: p.user?.email,
      mobile: p.user?.mobile,
      image: p.user?.image,
      gender: p.gender,
      dob: p.dob,
      address: p.address,
      city: p.city,
      state: p.state,
      pincode: p.pincode
    }));

    return res.status(200).json({
      status: 1,
      message: "Patients fetched successfully",
      data
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });
  }
};

exports.GetPatientDetails = async (req, res) => {
  try {
    const { patientId } = req.body;
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

    const patient = await Patient.findOne({
      where: { id: patientId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "mobile", "image"]
        }
      ]
    });

    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient not found"
      });
    }

    const appointments = await Appointment.findAll({
      where: { 
        patientId: patient.id,
        doctorId: doctor.id 
      },
      order: [["appointmentDateTime", "DESC"]]
    });

    const data = {
      id: patient.id,
      userId: patient.userId,
      name: patient.user?.name,
      email: patient.user?.email,
      mobile: patient.user?.mobile,
      image: patient.user?.image,
      gender: patient.gender,
      dob: patient.dob,
      address: patient.address,
      city: patient.city,
      state: patient.state,
      pincode: patient.pincode,
      joinedDate: patient.createdAt,
      appointments: appointments.map(apt => ({
        id: apt.id,
        appointmentDateTime: apt.appointmentDateTime,
        status: apt.status,
        reason: apt.reason,
        notes: apt.notes
      }))
    };

    return res.status(200).json({
      status: 1,
      message: "Patient details fetched successfully",
      data
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });
  }
};

exports.GetDoctorConsultationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { patientId, status, date } = req.body;

    const doctor = await Doctor.findOne({
      where: { userId }
    });

    if (!doctor) {
      return res.status(404).json({
        status: 0,
        message: "Doctor not found"
      });
    }

    const whereClause = { 
      doctorId: doctor.id,
      status: "completed"
    };

    if (patientId) {
      whereClause.patientId = patientId;
    }

    if (date) {
      const startOfDay = `${date} 00:00:00`;
      const endOfDay = `${date} 23:59:59`;
      whereClause.appointmentDateTime = {
        [Op.between]: [startOfDay, endOfDay]
      };
    }

    const consultations = await Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: ["id", "userId"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["name", "image"]
            }
          ]
        }
      ],
      order: [["appointmentDateTime", "DESC"]]
    });

    const data = consultations.map(consultation => ({
      id: consultation.id,
      patientId: consultation.patientId,
      patientName: consultation.patient?.user?.name,
      patientImage: consultation.patient?.user?.image ? `http://localhost:5000/${consultation.patient?.user?.image}` : null,
      appointmentDateTime: consultation.appointmentDateTime,
      status: consultation.status,
      reason: consultation.reason,
      notes: consultation.notes
    }));

    return res.status(200).json({
      status: 1,
      message: "Consultation history fetched successfully",
      data
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });
  }
};

// exports.GetPublicDoctorProfile = async (req, res) => {

//   try {
//     const { id } = req.params;

//     // Check if it's an ID-based slug (e.g., "1-amin-khan")
//     const idBasedMatch = id.match(/^(\d+)-/);
    
//     let doctor;
//     if (idBasedMatch) {
//       // Extract ID and query by ID
//       const doctorId = parseInt(idBasedMatch[1]);
//       doctor = await Doctor.findOne({
//         where: { id: doctorId },
//         include: [
//           {
//             model: User,
//             as: "user",
//             attributes: ["id", "name", "email", "mobile", "image"]
//           }
//         ]
//       });
//     } else {
//       // Name-based search with case-insensitive matching
//       // Convert URL spaces back to actual spaces and trim extra spaces
//       const searchName = id.replace(/%20/g, ' ').replace(/-/g, ' ').trim();
      
//       console.log('Searching for doctor with name:', searchName);
      
//       // Remove "Dr." prefix if present for alternative search
//       const nameWithoutDr = searchName.replace(/^Dr\.\s*/i, '').trim();
      
//       doctor = await Doctor.findOne({
//         include: [
//           {
//             model: User,
//             as: "user",
//             attributes: ["id", "name", "email", "mobile", "image"],
//             where: { 
//               [Op.or]: [
//                 { name: { [Op.iLike]: searchName } },
//                 { name: { [Op.iLike]: `Dr. ${searchName}` } },
//                 { name: { [Op.iLike]: nameWithoutDr } },
//                 { name: { [Op.iLike]: `Dr. ${nameWithoutDr}` } },
//                 { name: { [Op.iLike]: searchName.replace(/\s+/g, ' ') } },
//                 { name: { [Op.iLike]: nameWithoutDr.replace(/\s+/g, ' ') } }
//               ]
//             }
//           }
//         ]
//       });
      
//       console.log('Doctor found:', doctor ? doctor.user?.name : 'No');
//     }

//     if (!doctor) {
//       return res.status(404).json({
//         status: 0,
//         message: "Doctor not found"
//       });
//     }

//     const data = {
//       id: doctor.id,
//       name: doctor.user?.name,
//       email: doctor.user?.email,
//       mobile: doctor.user?.mobile,
//       image: doctor.user?.image ? `http://localhost:5000/${doctor.user?.image}` : null,
//       specialization: doctor.specialization,
//       qualification: doctor.qualification,
//       experience: doctor.experience,
//       consultationFee: doctor.consultationFee,
//       bio: doctor.bio,
//       IsExpert: doctor.IsExpert,
//       joinedDate: doctor.createdAt
//     };

//     return res.status(200).json({
//       status: 1,
//       message: "Doctor profile fetched successfully",
//       data
//     });

//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       status: 0,
//       message: "Something went wrong"
//     });
//   }
// };

exports.GetPublicDoctorProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's an ID-based slug (e.g., "1-amin-khan")
    const idBasedMatch = id.match(/^(\d+)-/);

    let doctor;
    if (idBasedMatch) {
      // Extract ID and query by ID
      const doctorId = parseInt(idBasedMatch[1]);
      doctor = await Doctor.findOne({
        where: { id: doctorId },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile", "image"]
          }
        ]
      });
    } else {
      // Name-based search with case-insensitive, partial matching
      const searchName = id.replace(/%20/g, ' ').replace(/-/g, ' ').trim();

      console.log('Searching for doctor with name:', searchName);

      // Remove "Dr." prefix if present for alternative search
      const nameWithoutDr = searchName.replace(/^Dr\.\s*/i, '').trim();

      doctor = await Doctor.findOne({
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile", "image"],
            where: {
              [Op.or]: [
                { name: { [Op.iLike]: `%${searchName}%` } },
                { name: { [Op.iLike]: `%${nameWithoutDr}%` } }
              ]
            }
          }
        ],
        order: [["id", "ASC"]] // deterministic pick if multiple matches
      });

      console.log('Doctor found:', doctor ? doctor.user?.name : 'No');
    }

    if (!doctor) {
      return res.status(404).json({
        status: 0,
        message: "Doctor not found"
      });
    }

    const data = {
      id: doctor.id,
      name: doctor.user?.name,
      email: doctor.user?.email,
      mobile: doctor.user?.mobile,
      image: doctor.user?.image ? `http://localhost:5000/${doctor.user?.image}` : null,
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      experience: doctor.experience,
      consultationFee: doctor.consultationFee,
      bio: doctor.bio,
      IsExpert: doctor.IsExpert,
      joinedDate: doctor.createdAt
    };

    return res.status(200).json({
      status: 1,
      message: "Doctor profile fetched successfully",
      data
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });
  }
};