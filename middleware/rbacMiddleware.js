const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 0,
        message: "Access denied",
      });
    }

    next();
  };
};

module.exports = authorizeRoles;