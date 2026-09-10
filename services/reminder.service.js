const { Appointment, Patient, Doctor, Notification, User } = require('../models');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  family: 4, // Force IPv4 to avoid IPv6 connectivity issues
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000, // 5 seconds
  socketTimeout: 10000, // 10 seconds
  tls: {
    rejectUnauthorized: false
  },
  // Additional DNS resolution options
  dns: {
    family: 4 // Force IPv4 DNS resolution
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@leafhomeo.com',
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

/**
 * Check and send appointment reminders
 * - 24 hours before appointment time
 */
const sendAppointmentReminders = async () => {
  try {
    console.log('Checking appointment reminders...');

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

    // Find appointments scheduled for tomorrow
    const appointments = await Appointment.findAll({
      where: {
        appointmentDateTime: {
          [Op.between]: [tomorrowStart, tomorrowEnd]
        },
        status: 'accepted'
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'userId']
        },
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['id', 'userId']
        }
      ]
    });

    console.log(`Found ${appointments.length} appointments for tomorrow`);

    for (const appointment of appointments) {
      // Get patient and doctor user details
      const patient = await User.findByPk(appointment.patient.userId);
      const doctor = await User.findByPk(appointment.doctor.userId);

      if (!patient || !doctor) {
        console.log(`Missing user data for appointment ${appointment.id}`);
        continue;
      }

      // Check if reminder already sent
      const existingReminder = await Notification.findOne({
        where: {
          userId: patient.id,
          type: 'appointment_reminder',
          referenceId: appointment.id
        }
      });

      if (existingReminder) {
        console.log(`Reminder already sent for appointment ${appointment.id}`);
        continue;
      }

      // Send email to patient
      await sendEmail({
        to: patient.email,
        subject: 'Appointment Reminder - Leaf Homeo',
        html: `
          <h2>Appointment Reminder</h2>
          <p>Dear ${patient.name},</p>
          <p>Your appointment with Dr. ${doctor.name} is scheduled for tomorrow at ${new Date(appointment.appointmentDateTime).toLocaleTimeString()}.</p>
          <p>Please make sure to complete your payment before the consultation.</p>
          <p>Thank you,<br>Leaf Homeo Team</p>
        `
      });

      // Create notification
      await Notification.create({
        userId: patient.id,
        senderId: doctor.id, // Doctor as sender
        title: 'Appointment Tomorrow',
        message: `Your appointment with Dr. ${doctor.name} is scheduled for tomorrow at ${new Date(appointment.appointmentDateTime).toLocaleTimeString()}`,
        type: 'appointment_reminder',
        referenceId: appointment.id,
        isRead: false
      });

      console.log(`Appointment reminder sent for appointment ${appointment.id}`);
    }

    console.log('Appointment reminders check completed');
  } catch (error) {
    console.error('Error sending appointment reminders:', error);
  }
};

/**
 * Check and send payment reminders
 * - 1 hour before appointment time (if unpaid)
 */
const sendPaymentReminders = async () => {
  try {
    console.log('Checking payment reminders...');

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHourStart = new Date(oneHourLater.setMinutes(0, 0, 0));
    const oneHourEnd = new Date(oneHourLater.setMinutes(59, 59, 999));

    // Find appointments in 1 hour that are unpaid
    const appointments = await Appointment.findAll({
      where: {
        appointmentDateTime: {
          [Op.between]: [oneHourStart, oneHourEnd]
        },
        status: {
          [Op.in]: ['accepted', 'payment_pending']
        }
      },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'userId']
        },
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['id', 'userId']
        }
      ]
    });

    console.log(`Found ${appointments.length} unpaid appointments in 1 hour`);

    for (const appointment of appointments) {
      // Get patient and doctor user details
      const patient = await User.findByPk(appointment.patient.userId);
      const doctor = await User.findByPk(appointment.doctor.userId);

      if (!patient || !doctor) {
        console.log(`Missing user data for appointment ${appointment.id}`);
        continue;
      }

      // Check if reminder already sent
      const existingReminder = await Notification.findOne({
        where: {
          userId: patient.id,
          type: 'payment_reminder',
          referenceId: appointment.id
        }
      });

      if (existingReminder) {
        console.log(`Payment reminder already sent for appointment ${appointment.id}`);
        continue;
      }

      // Send email to patient
      await sendEmail({
        to: patient.email,
        subject: 'Payment Reminder - Leaf Homeo',
        html: `
          <h2>Payment Reminder</h2>
          <p>Dear ${patient.name},</p>
          <p>Your appointment with Dr. ${doctor.name} is starting in 1 hour.</p>
          <p>Please complete your payment before the consultation starts.</p>
          <p>Thank you,<br>Leaf Homeo Team</p>
        `
      });

      // Create notification
      await Notification.create({
        userId: patient.id,
        senderId: doctor.id, // Doctor as sender
        title: 'Payment Required',
        message: `Please complete payment for your appointment with Dr. ${doctor.name} starting in 1 hour`,
        type: 'payment_reminder',
        referenceId: appointment.id,
        isRead: false
      });

      console.log(`Payment reminder sent for appointment ${appointment.id}`);
    }

    console.log('Payment reminders check completed');
  } catch (error) {
    console.error('Error sending payment reminders:', error);
  }
};

/**
 * Run all reminder checks
 */
const runReminderChecks = async () => {
  console.log('Running reminder checks at:', new Date().toISOString());
  await sendAppointmentReminders();
  await sendPaymentReminders();
  console.log('Reminder checks completed');
};

module.exports = {
  sendAppointmentReminders,
  sendPaymentReminders,
  runReminderChecks
};
