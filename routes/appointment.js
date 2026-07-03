var express = require('express');
var router = express.Router();
const appointmentController = require('../controller/appointment.controller');
const patientController = require('../controller/patient.controller');
const authMiddleware = require('../middleware/auth');

router.post('/book-appointment', authMiddleware, appointmentController.AppointmentBooking);
router.get('/upcoming-appointments', authMiddleware, appointmentController.UpcomingAppointments);
router.post('/my-appointments', authMiddleware, appointmentController.myAppointments);
router.post('/cancel-appointment', authMiddleware, appointmentController.CancelAppointment);

module.exports = router;
