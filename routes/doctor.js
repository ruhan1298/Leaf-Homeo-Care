const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");
const doctorController = require('../controller/doctor/DoctorAppointmentController');

router.post('/accept-appointment', authmiddleware, doctorController.AcceptAppointment);
router.post('/add-availability', authmiddleware, doctorController.AddAvailability);
module.exports = router;