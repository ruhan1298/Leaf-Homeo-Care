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
const twilioConfig = require("../config/twilio");




exports.register = async (req, res, next) => {
  try {
    const { name, email, mobile, password, otp, termsAccepted, phoneVerified } = req.body;

    // Validation
    if (!name || !email || !mobile || !password || termsAccepted === undefined)  {
      return res.status(400).json({
        status: 0,
        message: "All fields are required including terms acceptance",
      });
    }

    // Check if terms were accepted
    if (!termsAccepted) {
      return res.status(400).json({
        status: 0,
        message: "You must accept the terms and conditions to register",
      });
    }

    // Phone verification should be done via VerifyPhoneOTP API before registration
    // Trust the phoneVerified flag from frontend
    if (!phoneVerified) {
      return res.status(400).json({
        status: 0,
        message: "Please verify your phone number first using VerifyPhoneOTP API",
      });
    }

    // Format phone number to E.164 format for database
    let formattedMobile = mobile;
    if (!mobile.startsWith('+')) {
      formattedMobile = '+91' + mobile.replace(/\D/g, '');
    }

    // Check existing user by email or mobile (check both formats)
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { mobile: formattedMobile },
          { mobile: mobile }
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

    // Create User with formatted mobile number
    const user = await User.create({
      name,
      email,
      mobile: formattedMobile, // Store formatted number
      password: hashedPassword,
      role: "patient",
      isPhoneVerified: true,
      termsAccepted: true,
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
        IsCompleteProfile: patient.IsCompleteProfile,
        isPhoneVerified: user.isPhoneVerified,
        termsAccepted: user.termsAccepted,
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
    console.log(req.body,"boDY");
    

    if (!email || !password) {
      return res.status(400).json({
        status: 0,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      where: { email },
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

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      token,
    };

    // Add IsCompleteProfile for patients
    if (user.role === "patient" && user.patientProfile) {
      userData.IsCompleteProfile = user.patientProfile.IsCompleteProfile;
      userData.patientId = user.patientProfile.id;
    }

    return res.status(200).json({
      status: 1,
      message: "Login successful",
      data: userData,
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

    let data = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      mobile: userData.mobile,
      role: userData.role,
      image: userData.image,
    };

    // Only include relevant profile based on user role
    if (user.role === "patient" && userData.patientProfile) {
      data = {
        ...data,
        ...userData.patientProfile,
        IsCompleteProfile: userData.patientProfile.IsCompleteProfile,
      };
    } else if (user.role === "doctor" && userData.doctorProfile) {
      data = {
        ...data,
        ...userData.doctorProfile,
      };
    }

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
    }
  };

exports.UpdateProfile = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
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
    const image = req.file ? req.file.path : null;

    if (!name || !email || !mobile) {
      await transaction.rollback();
      return res.status(400).json({
        status: 0,
        message: "Name, email and mobile are required",
      });
    }

    const user = await User.findByPk(userId, { transaction });
    const patient = await Patient.findOne({
      where: { userId },
      transaction,
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        status: 0,
        message: "User not found",
      });
    }

    // Check if email or mobile already exists for another user
    if (email || mobile) {
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            ...(email ? [{ email }] : []),
            ...(mobile ? [{ mobile }] : []),
          ],
          id: { [Op.ne]: userId },
        },
        transaction,
      });

      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({
          status: 0,
          message: existingUser.email === email ? "Email already exists" : "Mobile already exists",
        });
      }
    }

    // Update User
    await user.update(
      {
        name,
        email,
        mobile,
        ...(image && { image }),
      },
      { transaction }
    );

    // Update Patient if exists
    if (patient) {
      await patient.update(
        {
          ...(gender !== undefined && { gender }),
          ...(dob !== undefined && { dob }),
          ...(houseNumber !== undefined && { houseNumber }),
          ...(addressLine1 !== undefined && { addressLine1 }),
          ...(addressLine2 !== undefined && { addressLine2 }),
          ...(landmark !== undefined && { landmark }),
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
          ...(pincode !== undefined && { pincode }),
          ...(country !== undefined && { country }),
          // Mark profile as complete if required fields are filled
          ...(gender && dob && addressLine1 && city && state && pincode && country
            ? { IsCompleteProfile: true }
            : {}),
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(200).json({
      status: 1,
      message: "Profile updated successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        IsCompleteProfile: patient?.IsCompleteProfile || false,
      },
    });
  } catch (error) {
    await transaction.rollback();
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
    const {
      name,
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

    // Update User
    await user.update(
      {
        name,
        ...(image && { image }),
      },
      { transaction }
    );

    // Update Patient
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
        image: image || patient.image, // Update image only if provided
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

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
      error: error.message,
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
    console.log(transporter,"EMAIL PASS")

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}. This code is valid for 10 minutes.`
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      status: 1,
      message: "OTP sent successfully"
    });

  } catch (err) {
    console.error("Email Sending Error:", err);

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

exports.SetupPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
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

    if (user.resetPasswordToken !== token) {
      return res.status(400).json({
        status: 0,
        message: "Invalid or expired token",
      });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({
        status: 0,
        message: "Token has expired",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await user.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      isPasswordSet: true,
    });

    return res.status(200).json({
      status: 1,
      message: "Password set successfully",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

exports.NotificationList = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all notifications
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

exports.DeleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Delete notification if it belongs to the user
    const deleted = await Notification.destroy({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (deleted === 0) {
      return res.status(404).json({
        status: 0,
        message: "Notification not found or doesn't belong to user",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

    exports.TruncateNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete all notifications for the user
    const deleted = await Notification.destroy({
      where: {
        userId,
      },
    });

    return res.status(200).json({
      status: 1,
      message: "All notifications deleted successfully",
      deletedCount: deleted,
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

exports.UpdateFcmToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        status: 0,
        message: "FCM token is required",
      });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: "User not found",
      });
    }

    await user.update({ fcmToken });

    return res.status(200).json({
      status: 1,
      message: "FCM token updated successfully",
    });
  } catch (error) {
    console.error("UpdateFcmToken Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

exports.SendPhoneOTP = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        status: 0,
        message: "Mobile number is required",
      });
    }

    // Format phone number to E.164 format
    let formattedMobile = mobile;
    if (!mobile.startsWith('+')) {
      // Assuming Indian numbers if no country code provided
      formattedMobile = '+91' + mobile.replace(/\D/g, ''); // Remove non-digits and add +91
    }

    // Check if mobile already exists (check both formatted and original)
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { mobile: formattedMobile },
          { mobile: mobile }
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        status: 0,
        message: "Mobile number already registered",
      });
    }

    // Send OTP using Twilio Verify or fallback
    try {
      const verification = await twilioConfig.sendOTP(formattedMobile);
      console.log("Twilio Verify Response:", verification);

      return res.status(200).json({
        status: 1,
        message: verification.otp && process.env.NODE_ENV === 'development' ? "OTP sent successfully (Development Mode)" : "OTP sent successfully",
        data: {
          status: verification.status,
          to: verification.to,
          otp: verification.otp, // Only in development
          formattedMobile: formattedMobile, // Send formatted number back to frontend
        },
      });
    } catch (twilioError) {
      console.error("Twilio Verify Error:", twilioError);
      return res.status(500).json({
        status: 0,
        message: "Failed to send OTP. Please try again.",
        error: twilioError.message,
      });
    }
  } catch (error) {
    console.error("SendPhoneOTP Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

exports.VerifyPhoneOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        status: 0,
        message: "Mobile number and OTP are required",
      });
    }

    // Format phone number to E.164 format
    let formattedMobile = mobile;
    if (!mobile.startsWith('+')) {
      formattedMobile = '+91' + mobile.replace(/\D/g, '');
    }

    // Verify OTP using Twilio Verify or fallback
    try {
      const verificationCheck = await twilioConfig.verifyOTP(formattedMobile, otp);
      
      // Handle both Twilio response and fallback response
      const isValid = verificationCheck.status === 'approved' || verificationCheck.valid === true;
      
      if (isValid) {
        return res.status(200).json({
          status: 1,
          message: "Phone number verified successfully",
          data: {
            isVerified: true,
            status: verificationCheck.status,
            formattedMobile: formattedMobile,
          },
        });
      } else {
        return res.status(400).json({
          status: 0,
          message: "Invalid OTP or verification failed",
          data: {
            status: verificationCheck.status,
          },
        });
      }
    } catch (twilioError) {
      console.error("Twilio Verify Check Error:", twilioError);
      return res.status(500).json({
        status: 0,
        message: "OTP verification failed. Please try again.",
        error: twilioError.message,
      });
    }
  } catch (error) {
    console.error("VerifyPhoneOTP Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

exports.GetTermsConditions = async (req, res) => {
  try {
    const TermsConditions = require("../models/termsconditions");

    const terms = await TermsConditions.findOne({
      order: [["createdAt", "DESC"]],
    });

    if (!terms) {
      return res.status(404).json({
        status: 0,
        message: "Terms and conditions not found",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Terms and conditions retrieved successfully",
      data: terms,
    });
  } catch (error) {
    console.error("GetTermsConditions Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};
