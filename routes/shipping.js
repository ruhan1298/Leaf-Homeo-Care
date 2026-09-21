const express = require("express");
const router = express.Router();
const shippingController = require("../controller/shipping.controller");

// Shiprocket webhook endpoint
router.post("/webhook", shippingController.handleShiprocketWebhook);


module.exports = router;