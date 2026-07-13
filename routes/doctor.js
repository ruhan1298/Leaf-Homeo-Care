const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");
const doctorController = require('../controller/doctor/DoctorAppointmentController');

router.post('/accept-appointment', authmiddleware, doctorController.AcceptAppointment);
router.post('/reject-appointment', authmiddleware, doctorController.RejectAppointment);
router.post('/add-availability', authmiddleware, doctorController.AddAvailability);
router.get('/get-availability', authmiddleware, doctorController.GetDoctorAvailability);
router.post('/update-availability', authmiddleware, doctorController.UpdateAvailability);
router.post('/delete-availability', authmiddleware, doctorController.DeleteAvailability);
router.post('/appointments', authmiddleware, doctorController.GetDoctorAppointments);
router.get('/patients', authmiddleware, doctorController.GetDoctorPatients);
router.post('/patient-details', authmiddleware, doctorController.GetPatientDetails);
router.post('/consultation-history', authmiddleware, doctorController.GetDoctorConsultationHistory);

module.exports = router;