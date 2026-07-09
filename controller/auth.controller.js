const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Doctor, Patient,Appointment,Payment } = require("../models");
const { Op } = require("sequelize");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const sequelize = require("../config/database");
const JWT_SECRET = process.env.JWT_SECRET;
const Sequelize = require("sequelize");
const Notification = require("../models/Notification");




exports.register = async (req, res, next) => {
  try {
    const { name, email, mobile, password } = req.body;

    // Validation
    if (!name || !email || !mobile || !password) {
      return res.status(400).json({
        status: 0,
        message: "All fields are required",
      });
    }

    // Check existing user by email or mobile
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { mobile }
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        status: 0,
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Mobile already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User
    const user = await User.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      role: "patient",
    });

    // Create Patient Profile
    const patient = await Patient.create({
      userId: user.id,
    });

    return res.status(201).json({
      status: 1,
      message: "Patient registered successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        patientId: patient.id,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    // Handle DB unique constraint errors
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        status: 0,
        message: error.errors[0].message,
      });
    }

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 0,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({
        status: 0,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        status: 0,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    return res.status(200).json({
      status: 1,
      message: "Login successful",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};
exports.GetUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: {
        exclude: [
          "password",
          "resetPasswordToken",
          "resetPasswordExpires",
        ],
      },
      include: [
        {
          model: Patient,
          as: "patientProfile",
        },
        {
          model: Doctor,
          as: "doctorProfile",
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: "User not found",
      });
    }

    const userData = user.toJSON();

    const data = {
      ...userData,
      ...(userData.patientProfile || {}),
      ...(userData.doctorProfile || {}),
    };

    delete data.patientProfile;
    delete data.doctorProfile;

    return res.status(200).json({
      status: 1,
      message: "User retrieved successfully",
      data,
    });

  } catch (error) {
    console.error("GetUser Error:", error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};
exports.ChangePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                status: 0,
                message: "Old password and new password are required",
            });
        }
        const user = await User.findByPk(userId);

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                status: 0,
                message: "Old password is incorrect",
            });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await user.update({ password: hashedNewPassword });

        return res.status(200).json({
            status: 1,
            message: "Password changed successfully",
        });
        
    } catch (error) {
        console.error("ChangePassword Error:", error); 
        return res.status(500).json({   
            status: 0,
            message: "Something went wrong",
        });
    };
  };

exports.UpdateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, mobile } = req.body;

    if (!name || !email || !mobile) {
      return res.status(400).json({
        status: 0,
        message: "Name, email and mobile are required",
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: "User not found",
      });
    }

    // Check if email or mobile already exists for another user
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { mobile }
        ],
        id: { [Op.ne]: userId }
      },
    });

    if (existingUser) {
      return res.status(400).json({
        status: 0,
        message: existingUser.email === email ? "Email already exists" : "Mobile already exists",
      });
    }

    await user.update({
      name,
      email,
      mobile,
    });

    return res.status(200).json({
      status: 1,
      message: "Profile updated successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("UpdateProfile Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};
 exports.CompleteProfile = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const image = req.file ? req.file.path : null;
    console.log(image, "Image Path");

    const {
      name,
      email,
      mobile,
      gender,
      dob,
      houseNumber,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      country,
    } = req.body;
    console.log(req.body,"BoDY");
    

    const user = await User.findByPk(userId, { transaction });
    const patient = await Patient.findOne({
      where: { userId },
      transaction,
    });

    if (!user || !patient) {
      await transaction.rollback();

      return res.status(404).json({
        status: 0,
        message: "User/Patient not found",
      });
    }

    await user.update(
      {
        name,
        email,
        mobile,
        image,
      },
      { transaction }
    );

    await patient.update(
      {
        gender,
        dob,
        houseNumber,
        addressLine1,
        addressLine2,
        landmark,
        city,
        state,
        pincode,
        country,
        IsCompleteProfile: true,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(200).json({
      status: 1,
      message: "Profile completed successfully",
    });
  } catch (error) {
    await transaction.rollback();

    console.error(error);
    console.log(error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

exports.ForgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: "User not found"
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    const expiry = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await user.update({
      resetPasswordToken: otp,
      resetPasswordExpires: expiry
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASS ? "PASS OK" : "PASS MISSING");

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}. It is valid for 10 minutes.`
    });

    return res.status(200).json({
      status: 1,
      message: "OTP sent successfully"
    });

  } catch (err) {
    console.log(err);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });
  }
};

exports.VerifyOTP = async (req, res) => {
  try {

    const { email, otp } = req.body;

    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: "User not found"
      });
    }

    if (
      user.resetPasswordToken !== otp
    ) {
      return res.status(400).json({
        status: 0,
        message: "Invalid OTP"
      });
    }

    if (
      new Date() >
      user.resetPasswordExpires
    ) {
      return res.status(400).json({
        status: 0,
        message: "OTP expired"
      });
    }

    return res.status(200).json({
      status: 1,
      message: "OTP verified successfully"
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });

  }
};
exports.ResetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        status: 0,
        message: "All fields are required",
      });
    }

    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: "User not found",
      });
    }

    if (user.resetPasswordToken !== otp) {
      return res.status(400).json({
        status: 0,
        message: "Invalid OTP",
      });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({
        status: 0,
        message: "OTP has expired",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await user.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return res.status(200).json({
      status: 1,
      message: "Password reset successfully",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

exports.NotificationList = async (req, res, next) => {
 const userId = req.user.id;
  try {
    const notifications = await Notification.findAll({
      where: {
        userId: userId,
      },
      order: [["createdAt", "DESC"]],
    });
    await Notification.update(
      { isRead: true },
      {
        where: {
          userId: userId,
          isRead: false,
        },
      }
    );
    return res.status(200).json({
      status: 1,
      message: "Notifications retrieved successfully",
      data: notifications
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong"
    });
  }
};
  
exports.NotificationList = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      { isRead: true },
      {
        where: {
          userId,
          isRead: false,
        },
      }
    );

    const notifications = await Notification.findAll({
      where: {
        userId,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      status: 1,
      message: "Notifications retrieved successfully",
      data: notifications,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};



    exports.DeleteUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: "User not found",
      });
    }

    // Doctor
    if (user.role === "doctor") {
      const doctor = await Doctor.findOne({
        where: { userId },
      });

      if (doctor) {
        const appointments = await Appointment.findAll({
          where: { doctorId: doctor.id },
          attributes: ["id"],
        });

        const appointmentIds = appointments.map(
          (appointment) => appointment.id
        );

        if (appointmentIds.length > 0) {
          await Payment.destroy({
            where: {
              appointmentId: appointmentIds,
            },
          });

          await Appointment.destroy({
            where: {
              id: appointmentIds,
            },
          });
        }

        await doctor.destroy();
      }
    }

    // Patient
    if (user.role === "patient") {
      const patient = await Patient.findOne({
        where: { userId },
      });

      if (patient) {
        const appointments = await Appointment.findAll({
          where: { patientId: patient.id },
          attributes: ["id"],
        });

        const appointmentIds = appointments.map(
          (appointment) => appointment.id
        );

        if (appointmentIds.length > 0) {
          await Payment.destroy({
            where: {
              appointmentId: appointmentIds,
            },
          });

          await Appointment.destroy({
            where: {
              id: appointmentIds,
            },
          });
        }

        await patient.destroy();
      }
    }

    await user.destroy();

    return res.status(200).json({
      status: 1,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};
