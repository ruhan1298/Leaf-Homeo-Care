const express = require("express");
const router = express.Router();
const paymentController = require('../controller/payment.controller')
const authMiddleware = require('../middleware/auth');

router.post('/payment',authMiddleware,paymentController.createOrder)
router.post("/webhook", paymentController.razorpayWebhook);
module.exports = router;
