const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Doctor, Patient,Appointment,Payment,Notification,Review } = require("../models");
const { Op,fn,col} = require("sequelize");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const JWT_SECRET = process.env.JWT_SECRET;
const Sequelize = require("sequelize");
const admin = require('../config/firebase')

exports.ExpertDoctors = async (req, res, next) => {
try {
    const { search = "" } = req.body;

    const whereCondition = {
      IsExpert: true,
    };

    if (search.trim()) {
      whereCondition[Op.or] = [
        Sequelize.where(
          Sequelize.col("user.name"),
          {
            [Op.iLike]: `%${search}%`,
          }
        ),

        Sequelize.where(
          Sequelize.cast(
            Sequelize.col("Doctor.specialization"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${search}%`,
          }
        ),

        {
          qualification: {
            [Op.iLike]: `%${search}%`,
          },
        },

        {
          bio: {
            [Op.iLike]: `%${search}%`,
          },
        },

        Sequelize.where(
          Sequelize.cast(
            Sequelize.col("Doctor.experience"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${search}%`,
          }
        ),

        Sequelize.where(
          Sequelize.cast(
            Sequelize.col("Doctor.consultationFee"),
            "TEXT"
          ),
          {
            [Op.iLike]: `%${search}%`,
          }
        ),
      ];
    }

    const expertDoctors = await Doctor.findAll({
      where: whereCondition,
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
      order: [["createdAt", "DESC"]],
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
exports.DoctorDetails = async (req, res) => {
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

    // Average Rating & Total Reviews
    const ratingData = await Review.findOne({
      where: { doctorId },
      attributes: [
        [fn("AVG", col("rating")), "averageRating"],
        [fn("COUNT", col("id")), "totalReviews"],
      ],
      raw: true,
    });

    // Reviews List
    const reviews = await Review.findAll({
      where: { doctorId },
      attributes: ["id", "rating", "review", "createdAt"],
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["name"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const data = {
      ...doctor.toJSON(),
      name: doctor.user?.name,
      image: doctor.user?.image,
      averageRating: Number(ratingData?.averageRating || 0).toFixed(1),
      totalReviews: Number(ratingData?.totalReviews || 0),

      reviews: reviews.map((item) => ({
        id: item.id,
        rating: item.rating,
        review: item.review,
        patientName: item.patient?.user?.name,
        createdAt: item.createdAt,
      })),
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

exports.HomePage = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId,"USERID");
const patient = await Patient.findOne({
  where: { userId },
  attributes: ["id"],
});

if (!patient) {
  return res.status(404).json({
    status: 0,
    message: "Patient profile not found",
  });
}    

    const user = await User.findOne({
      where: { id: userId },
      attributes: ["id", "name", "email", "image"],
    });

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: "User not found",
      });
    }

    const appointments = await Appointment.findAll({
      where: {
        patientId: patient.id,
        appointmentDateTime: {
          [Op.gte]: new Date(),
        },
        status: "paid",
      },
      order: [["appointmentDateTime", "ASC"]],
      limit: 5,
      include: [
        {
          model: Doctor,
          as: "doctor",
          attributes: ["id", "specialization", "experience"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["name", "image"],
            },
          ],
        },
      ],
    });
    console.log(appointments,"Appointment");
    

    const topDoctors = await Doctor.findAll({
      where: { IsExpert: true },
      limit: 5,
      attributes: ["id", "specialization", "experience"],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "image"],
        },
      ],
    });

    // Get all doctor ids
    const doctorIds = [
      ...new Set([
        ...appointments
          .filter((a) => a.doctor)
          .map((a) => a.doctor.id),
        ...topDoctors.map((d) => d.id),
      ]),
    ];

    // Ratings of all doctors in one query
    const ratings = await Review.findAll({
      where: {
        doctorId: doctorIds,
      },
      attributes: [
        "doctorId",
        [fn("AVG", col("rating")), "averageRating"],
      ],
      group: ["doctorId"],
      raw: true,
    });

    const ratingMap = {};

    ratings.forEach((item) => {
      ratingMap[item.doctorId] = Number(item.averageRating).toFixed(1);
    });

    const formattedAppointments = appointments.map((appt) => ({
      id: appt.id,
      date: appt.appointmentDateTime,
      status: appt.status,
      doctor: appt.doctor
        ? {
            id: appt.doctor.id,
            name: appt.doctor.user?.name,
            specialty: appt.doctor.specialization,
            image: appt.doctor.user?.image,
            experience: appt.doctor.experience,
            rating: ratingMap[appt.doctor.id] || "0.0",
          }
        : null,
    }));

    const formattedTopDoctors = topDoctors.map((doc) => ({
      id: doc.id,
      name: doc.user?.name,
      specialty: doc.specialization,
      image: doc.user?.image,
      experience: doc.experience,
      rating: ratingMap[doc.id] || "0.0",
    }));



    return res.status(200).json({
      status: 1,
      message: "Home page data fetched successfully",
      data: {
        user,
        appointments: formattedAppointments,
        topDoctors: formattedTopDoctors,
      },
    });
  } catch (error) {
    console.error("HomePage error:", error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

exports.SendNotification = async (req, res) => {
  try {
    const { userId, title, body } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        status: 0,
        message: "userId, title and body are required",
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: "User not found",
      });
    }

    if (!user.fcmToken) {
      return res.status(400).json({
        status: 0,
        message: "User FCM token not found",
      });
    }

    const message = {
      token: user.fcmToken,
      notification: {
        title,
        body,
      },
    };

    const response = await admin.messaging().send(message);

    return res.status(200).json({
      status: 1,
      message: "Notification sent successfully",
      messageId: response,
    });
  } catch (error) {
    console.error("FCM Error:", error);

    return res.status(500).json({
      status: 0,
      message: error.message,
    });
  }
};
// exports.Search = async (req, res) => {
//   try {
//     const { search = "" } = req.body;

//     const doctors = await Doctor.findAll({
//       where: {
//         IsExpert: true,
//         ...(search && {
//           [Op.or]: [
//             Sequelize.where(Sequelize.col("user.name"), {
//               [Op.iLike]: `%${search}%`,
//             }),

//             {
//               specialization: {
//                 [Op.overlap]: [search],
//               },
//             },

//             {
//               qualification: {
//                 [Op.iLike]: `%${search}%`,
//               },
//             },

//             Sequelize.where(
//               Sequelize.cast(Sequelize.col("Doctor.experience"), "TEXT"),
//               {
//                 [Op.iLike]: `%${search}%`,
//               }
//             ),

//             Sequelize.where(
//               Sequelize.cast(
//                 Sequelize.col("Doctor.consultationFee"),
//                 "TEXT"
//               ),
//               {
//                 [Op.iLike]: `%${search}%`,
//               }
//             ),

//             {
//               bio: {
//                 [Op.iLike]: `%${search}%`,
//               },
//             },
//           ],
//         }),
//       },
//       include: [
//         {
//           model: User,
//           as: "user",
//           attributes: ["id", "name", "email", "mobile", "image"],
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     return res.status(200).json({
//       status: 1,
//       message: "Expert doctors fetched successfully",
//       data: doctors,
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       status: 0,
//       message: error.message,
//     });
//   }
// };