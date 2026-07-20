const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const Doctor = require("../../models/Doctor");
const crypto = require("crypto");

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

    // Generate random temporary password (will be reset via email link)
    const tempPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create User
    const user = await User.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      role: "doctor",
      isPasswordSet: false,
    });

    // Generate reset token for password setup
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await user.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpiry
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

    // Send Email with reset password link
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/doctor/setup-password?token=${resetToken}&email=${email}`;

    const emailTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Leaf Homeo Care</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #00B100 0%, #008800 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .welcome-text {
            font-size: 18px;
            margin-bottom: 20px;
            color: #555;
          }
          .info-box {
            background: #f8f9fa;
            border-left: 4px solid #00B100;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info-box p {
            margin: 5px 0;
            font-size: 14px;
          }
          .info-box strong {
            color: #00B100;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #00B100 0%, #008800 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 15px rgba(0, 177, 0, 0.3);
            transition: all 0.3s ease;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 177, 0, 0.4);
          }
          .security-note {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            font-size: 13px;
            color: #856404;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #777;
            border-top: 1px solid #e9ecef;
          }
          .footer a {
            color: #00B100;
            text-decoration: none;
          }
          .emoji {
            font-size: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌿 Leaf Homeo Care</h1>
            <p>Welcome to Our Healthcare Platform</p>
          </div>
          <div class="content">
            <p class="welcome-text">Dear Dr. <strong>${name}</strong>,</p>
            <p class="welcome-text">We are pleased to inform you that your doctor account has been successfully created on the Leaf Homeo Care platform.</p>
            
            <div class="info-box">
              <p><strong>📧 Email:</strong> ${email}</p>
              <p><strong>📱 Mobile:</strong> ${mobile}</p>
              <p><strong>🩺 Role:</strong> Doctor</p>
            </div>

            <p class="welcome-text">To get started, please set up your password by clicking the button below:</p>

            <div class="button-container">
              <a href="${resetLink}" class="button">Set Your Password</a>
            </div>

            <div class="security-note">
              <strong>🔒 Security Notice:</strong>
              <p>This link will expire in 24 hours for your security. If you did not request this account creation, please ignore this email.</p>
            </div>

            <p class="welcome-text">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

            <p class="welcome-text">Best regards,<br>The Leaf Homeo Care Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Leaf Homeo Care. All rights reserved.</p>
            <p>This is an automated email. Please do not reply directly.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Leaf Homeo Care - Set Your Password",
      html: emailTemplate,
    });

    return res.status(201).json({
      status: 1,
      message: "Doctor added successfully",
      data: doctor,
    });
  } catch (error) {
    console.log(error.message);
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
          attributes: ["name", "email", "mobile", "image", "isPasswordSet"],
          required: false,
        },
      ],

      distinct: true,

      limit: Number(limit),
      offset,

      order: [["id", "DESC"]],
    });

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

    const doctor = await Doctor.findByPk(doctorId);
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
      image: image || user.image,
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