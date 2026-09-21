const { Appointment } = require("../models");
const crypto = require('crypto');

exports.handleShiprocketWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    console.log('Shiprocket Webhook received:', JSON.stringify(webhookData));

    // Secret Token Validation (Security Check)
    const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;
    if (webhookSecret) {
      const token = req.headers['x-api-key'] || req.headers['x-shiprocket-token'];
      if (token !== webhookSecret) {
        console.error('Invalid webhook token');
        return res.status(403).json({ status: 0, message: 'Invalid token' });
      }
    }

    // Custom Order ID extraction ("ORD-18-1789990152127")
    const customOrderId = webhookData.custom_order_id || webhookData.channel_order_id || webhookData.order_id;

    if (!customOrderId) {
      return res.status(400).json({ status: 0, message: 'Order ID missing' });
    }

    // "ORD-18-1789990152127" me se Appointment ID (18) extract karna
    let appointmentId = customOrderId;
    if (typeof customOrderId === 'string' && customOrderId.startsWith('ORD-')) {
      appointmentId = customOrderId.split('-')[1];
    }

    const appointment = await Appointment.findByPk(appointmentId);

    if (!appointment) {
      console.log('Appointment not found for ID:', appointmentId);
      return res.status(404).json({ status: 0, message: 'Appointment not found' });
    }

    let updateData = {};
    const currentStatus = webhookData.current_status?.toLowerCase() || req.body.status?.toLowerCase();
    const awbCode = webhookData.awb || webhookData.awb_code;

    // AWB & Courier details save karo
    if (awbCode) {
      updateData.trackerId = awbCode;
    }
    if (webhookData.courier_name) {
      updateData.courierName = webhookData.courier_name;
    }

    // Shiprocket Status mapping
    switch (currentStatus) {
      case 'awb assigned':
      case 'label generated':
        updateData.shippingStatus = 'ready_to_transit';
        break;

      case 'shipped':
      case 'in transit':
      case 'out for delivery':
        updateData.shippingStatus = 'in_transit';
        break;

      case 'delivered':
        updateData.shippingStatus = 'delivered';
        break;

      case 'canceled':
      case 'cancelled':
        updateData.shippingStatus = 'cancelled';
        break;

      case 'rto initiated':
      case 'rto delivered':
        updateData.shippingStatus = 'returned';
        break;

      default:
        console.log('Unhandled status event:', currentStatus);
    }

    // Database Update
    if (Object.keys(updateData).length > 0) {
      await appointment.update(updateData);
      console.log(`Appointment ID ${appointmentId} updated via Webhook:`, updateData);
    }

    return res.status(200).json({ 
      status: 1, 
      message: 'Webhook processed successfully' 
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ 
      status: 0, 
      message: 'Internal server error' 
    });
  }
};