const { Coupon, Payment } = require("../models");
const { Op } = require("sequelize");

exports.createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, expireTime, description, isActive } = req.body;

    if (!code || !discountType || !discountValue || !expireTime) {
      return res.status(400).json({
        status: 0,
        message: "Please provide all required fields",
      });
    }

    if (discountType === "percentage" && (discountValue < 0 || discountValue > 100)) {
      return res.status(400).json({
        status: 0,
        message: "Percentage discount must be between 0 and 100",
      });
    }

    if (discountValue < 0) {
      return res.status(400).json({
        status: 0,
        message: "Discount value must be positive",
      });
    }

    const existingCoupon = await Coupon.findOne({
      where: { code: code.toUpperCase() },
    });

    if (existingCoupon) {
      return res.status(400).json({
        status: 0,
        message: "Coupon code already exists",
      });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      expireTime,
      description,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({
      status: 1,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    console.error("Create coupon error:", error);
    return res.status(500).json({
      status: 0,
      message: error.message || "Failed to create coupon",
    });
  }
};

exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      status: 1,
      message: "Coupons retrieved successfully",
      data: coupons,
    });
  } catch (error) {
    console.error("Get coupons error:", error);
    return res.status(500).json({
      status: 0,
      message: error.message || "Failed to retrieve coupons",
    });
  }
};

exports.getActiveCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      where: {
        isActive: true,
      },
      order: [["expireTime", "ASC"]],
    });

    // Filter out expired coupons at the application level
    const activeCoupons = coupons.filter(coupon => {
      const expireDate = new Date(coupon.expireTime);
      expireDate.setHours(23, 59, 59, 999); // Set to end of the day
      return new Date() <= expireDate;
    });

    return res.status(200).json({
      status: 1,
      message: "Active coupons retrieved successfully",
      data: activeCoupons,
    });
  } catch (error) {
    console.error("Get active coupons error:", error);
    return res.status(500).json({
      status: 0,
      message: error.message || "Failed to retrieve active coupons",
    });
  }
};

exports.getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({
        status: 0,
        message: "Coupon not found",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Coupon retrieved successfully",
      data: coupon,
    });
  } catch (error) {
    console.error("Get coupon error:", error);
    return res.status(500).json({
      status: 0,
      message: error.message || "Failed to retrieve coupon",
    });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discountType, discountValue, expireTime, description, isActive } = req.body;

    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({
        status: 0,
        message: "Coupon not found",
      });
    }

    if (code && code !== coupon.code) {
      const existingCoupon = await Coupon.findOne({
        where: { code: code.toUpperCase() },
      });

      if (existingCoupon) {
        return res.status(400).json({
          status: 0,
          message: "Coupon code already exists",
        });
      }
    }

    if (discountType === "percentage" && discountValue && (discountValue < 0 || discountValue > 100)) {
      return res.status(400).json({
        status: 0,
        message: "Percentage discount must be between 0 and 100",
      });
    }

    if (discountValue && discountValue < 0) {
      return res.status(400).json({
        status: 0,
        message: "Discount value must be positive",
      });
    }

    await coupon.update({
      code: code ? code.toUpperCase() : coupon.code,
      discountType: discountType || coupon.discountType,
      discountValue: discountValue || coupon.discountValue,
      expireTime: expireTime || coupon.expireTime,
      description: description !== undefined ? description : coupon.description,
      isActive: isActive !== undefined ? isActive : coupon.isActive,
    });

    return res.status(200).json({
      status: 1,
      message: "Coupon updated successfully",
      data: coupon,
    });
  } catch (error) {
    console.error("Update coupon error:", error);
    return res.status(500).json({
      status: 0,
      message: error.message || "Failed to update coupon",
    });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({
        status: 0,
        message: "Coupon not found",
      });
    }

    await coupon.destroy();

    return res.status(200).json({
      status: 1,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Delete coupon error:", error);
    return res.status(500).json({
      status: 0,
      message: error.message || "Failed to delete coupon",
    });
  }
};

exports.validateCoupon = async (req, res) => {
  try {
    const { code, amount } = req.body;

    if (!code || !amount) {
      return res.status(400).json({
        status: 0,
        message: "Coupon code and amount are required",
      });
    }

    const coupon = await Coupon.findOne({
      where: {
        code: code.toUpperCase(),
        isActive: true,
      },
    });

    if (!coupon) {
      return res.status(400).json({
        status: 0,
        message: "Invalid coupon code",
      });
    }

    // Check expiry - set expire time to end of day for comparison
    const expireDate = new Date(coupon.expireTime);
    expireDate.setHours(23, 59, 59, 999); // Set to end of the day

    if (new Date() > expireDate) {
      return res.status(400).json({
        status: 0,
        message: "Coupon has expired",
      });
    }

    let discountAmount = 0;

    if (coupon.discountType === "fixed") {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === "percentage") {
      discountAmount = (amount * coupon.discountValue) / 100;
    }

    if (discountAmount > amount) {
      discountAmount = amount;
    }

    const finalAmount = amount - discountAmount;

    return res.status(200).json({
      status: 1,
      message: "Coupon validated successfully",
      data: {
        couponId: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        description: coupon.description,
      },
    });
  } catch (error) {
    console.error("Validate coupon error:", error);
    return res.status(500).json({
      status: 0,
      message: error.message || "Failed to validate coupon",
    });
  }
};

exports.getCouponStats = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByPk(id);

    if (!coupon) {
      return res.status(404).json({
        status: 0,
        message: "Coupon not found",
      });
    }

    const payments = await Payment.findAll({
      where: { couponId: id },
    });

    const totalUsage = payments.length;
    const totalDiscount = payments.reduce((sum, payment) => sum + (payment.discountAmount || 0), 0);

    return res.status(200).json({
      status: 1,
      message: "Coupon stats retrieved successfully",
      data: {
        couponId: coupon.id,
        code: coupon.code,
        totalUsage,
        totalDiscount,
        payments: payments,
      },
    });
  } catch (error) {
    console.error("Get coupon stats error:", error);
    return res.status(500).json({
      status: 0,
      message: error.message || "Failed to retrieve coupon stats",
    });
  }
};