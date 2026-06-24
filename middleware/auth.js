const jwt = require("jsonwebtoken");
require("dotenv").config();


const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({
        status: 0,
        message: "Token required",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();

  } catch (error) {
    return res.status(401).json({
      status: 0,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;