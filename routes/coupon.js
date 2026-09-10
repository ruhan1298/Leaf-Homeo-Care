const express = require("express");
const router = express.Router();
const couponController = require("../controller/coupon.controller");
const authMiddleware = require("../middleware/auth");

// Admin routes
router.post("/admin/coupons", authMiddleware, couponController.createCoupon);
router.get("/admin/coupons", authMiddleware, couponController.getAllCoupons);
router.get("/admin/coupons/:id", authMiddleware, couponController.getCouponById);
router.put("/admin/coupons/:id", authMiddleware, couponController.updateCoupon);
router.delete("/admin/coupons/:id", authMiddleware, couponController.deleteCoupon);
router.get("/admin/coupons/:id/stats", authMiddleware, couponController.getCouponStats);

// User routes
router.get("/coupons/active", couponController.getActiveCoupons);
router.post("/coupons/validate", couponController.validateCoupon);

module.exports = router;