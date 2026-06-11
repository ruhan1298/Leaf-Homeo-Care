const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Doctor, Patient } = require("../models");

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
            attributes: { exclude: ['password'] },
        });

        return res.status(200).json({
            status: 1,
            message: "User retrieved successfully",
            data: user,
        });

    } catch (error) {
        console.error("GetUser Error:", error); 
        return res.status(500).json({
            status: 0,
            message: "Something went wrong",
        });
    }


}   
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
}