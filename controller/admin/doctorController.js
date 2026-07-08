const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const Doctor = require("../../models/Doctor");

const { Op } = require("sequelize");
const nodemailer = require("nodemailer");
const JWT_SECRET = process.env.JWT_SECRET;
exports.AddDoctor = async (req, res, next) => {
    try {
    const {
      name,
      email,
      mobile,
      specialization,
      qualification,
      experience,
      consultationFee,
      bio,
      IsExpert,
    } = req.body;

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { mobile }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        status: 0,
        message: "Email or Mobile already exists",
      });
    }

    // Generate Password
    const plainPassword =
      "Dr@" + Math.floor(100000 + Math.random() * 900000);

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create User
    const user = await User.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      role: "doctor",
    });

    // Create Doctor Profile
    const doctor = await Doctor.create({
      userId: user.id,
      specialization,
      qualification,
      experience,
      consultationFee,
      bio,
      IsExpert,
    });

    // Send Email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Doctor Account Created",
      html: `
        <h3>Welcome Dr. ${name}</h3>
        <p>Your account has been created successfully.</p>

        <p><b>Email:</b> ${email}</p>
        <p><b>Password:</b> ${plainPassword}</p>

        <p>Please login and change your password.</p>
      `,
    });

    return res.status(201).json({
      status: 1,
      message: "Doctor added successfully",
      data: doctor,
    });
  } catch (error) {
    log(error.message);
    next(error);
  }

}

exports.GetDoctors = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.body;

    const offset = (page - 1) * Number(limit);

    const where = {};

    if (search) {
      where[Op.or] = [
        { specialization: { [Op.iLike]: `%${search}%` } },
        { qualification: { [Op.iLike]: `%${search}%` } },
        { bio: { [Op.iLike]: `%${search}%` } },
     
      

        { "$user.name$": { [Op.iLike]: `%${search}%` } },
        { "$user.email$": { [Op.iLike]: `%${search}%` } },
        { "$user.mobile$": { [Op.iLike]: `%${search}%` } },
          ...( !isNaN(search)
      ? [
          { consultationFee: Number(search) },
          { experience: Number(search) }
        ]
      : []
  )
      ];
    }

    const { count, rows } = await Doctor.findAndCountAll({
      where,

      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email", "mobile","image"],
          required: false,
        },
      ],

      distinct: true,

      limit: Number(limit),
      offset,

      order: [["id", "DESC"]],
    });

    console.log("Doctors fetched:", rows);

    return res.status(200).json({
      status: 1,
      message: "Doctors fetched successfully",
      data: {
        doctors: rows,
        totalRecords: count,
        currentPage: Number(page),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.DeleteDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.body;

    const doctor = await Doctor.findByPk(doctorId);

    if (!doctor) {
      return res.status(404).json({
        status: 0,
        message: "Doctor not found",
      });
    }

    const userId = doctor.userId;

    await doctor.destroy();

    await User.destroy({
      where: {
        id: userId,
      },
    });

    return res.status(200).json({
      status: 1,
      message: "Doctor deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
exports.UpdateDoctor = async (req, res, next) => {
  try {
    const image = req.file ? req.file.path : null;
    const {
      doctorId,
      name,
      email,
      mobile,
      specialization,
      qualification,
      experience,
      consultationFee,
      bio,
      IsExpert,

    } = req.body;
    console.log(req.body,"BODY");
    console.log(image,"IMAGE");

const doctor = await Doctor.findOne({
  where: {
    userId: doctorId
  }

});
console.log(doctor,"DOCTOR");
    if (!doctor) {
      return res.status(404).json({
        status: 0,
        message: "Doctor not found"
      });
    }


    const user = await User.findByPk(doctor.userId);

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: "User not found",
      });
    }

    await user.update({
      name,
      email,
      mobile,
      image: image || user.image, // Update image only if a new one is provided
    });

    await doctor.update({
      specialization,
      qualification,
      experience,
      consultationFee,
      bio,
      IsExpert,
    });

    return res.status(200).json({
      status: 1,
      message: "Doctor updated successfully",
    });
  } catch (error) {
    next(error);
  }
};