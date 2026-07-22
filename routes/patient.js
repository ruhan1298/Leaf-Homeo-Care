var express = require('express');
var router = express.Router();
const patientController = require('../controller/patient.controller');
const authMiddleware = require('../middleware/auth');
router.post('/get-expert-doctors', patientController.ExpertDoctors);
router.post('/get-doctor-details', patientController.DoctorDetails);
router.get('/home-page',authMiddleware, patientController.HomePage);
router.post('/send-notification',patientController.SendNotification)
// router.post('/search',authMiddleware,patientController.Search)


module.exports = router;
