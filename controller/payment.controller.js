const Razorpay = require("../config/razorpay");
const { Appointment, Doctor, Payment } = require("../models");

const crypto = require("crypto");



exports.createOrder = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        status: 0,
        message: "Appointment ID is required",
      });
    }

    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        {
          model: Doctor,
          as: "doctor",
          attributes: ["id", "consultationFee"],
        },
      ],
    });

    if (!appointment) {
      return res.status(404).json({
        status: 0,
        message: "Appointment not found",
      });
    }

    if (appointment.status !== "accepted") {
      return res.status(400).json({
        status: 0,
        message: "Appointment is not accepted yet",
      });
    }

    if (!appointment.doctor) {
      return res.status(400).json({
        status: 0,
        message: "Doctor not assigned",
      });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      where: {
        appointmentId: appointment.id,
      },
    });

    if (existingPayment) {
      return res.status(400).json({
        status: 0,
        message: "Payment already initiated for this appointment",
      });
    }

    const amount = Number(appointment.doctor.consultationFee);

    const options = {
      amount: amount * 100, // Razorpay amount in paise
      currency: "INR",
      receipt: `appointment_${appointment.id}`,
    };

    const order = await Razorpay.orders.create(options);

    const payment = await Payment.create({
      appointmentId: appointment.id,
      amount,
      currency: "INR",
      orderId: order.id,
      gateway: "razorpay",
      status: "pending",
    });

    return res.status(200).json({
      status: 1,
      message: "Order created successfully",
      data: {
        paymentId: payment.id,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: 0,
      message: error.message,
    });
  }
};


exports.razorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const razorpaySignature = req.headers["x-razorpay-signature"];

    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        status: 0,
        message: "Invalid webhook signature",
      });
    }

    const payload = JSON.parse(req.body.toString());

    switch (payload.event) {

      case "payment.captured": {

        const paymentEntity = payload.payload.payment.entity;

        const payment = await Payment.findOne({
          where: {
            orderId: paymentEntity.order_id,
          },
        });

        if (payment && payment.status !== "paid") {

        //   payment.transactionId = paymentEntity.id; // Razorpay Payment ID
          payment.paymentId = paymentEntity.id;
          payment.signature = razorpaySignature;
          payment.status = "paid";
          payment.paidAt = new Date();

          await payment.save();

          await Appointment.update(
            {
              status: "paid",
            },
            {
              where: {
                id: payment.appointmentId,
              },
            }
          );
        }

        break;
      }

      case "payment.failed": {

        const paymentEntity = payload.payload.payment.entity;

        await Payment.update(
          {
            status: "failed",
            transactionId: paymentEntity.id,
            paymentId: paymentEntity.id,
          },
          {
            where: {
              orderId: paymentEntity.order_id,
            },
          }
        );

        break;
      }

      default:
        console.log("Unhandled Event :", payload.event);
    }

    return res.status(200).json({
      status: 1,
      message: "Webhook received successfully",
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      status: 0,
      message: error.message,
    });
  }
};