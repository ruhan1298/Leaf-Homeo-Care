var express = require('express');
var router = express.Router();
const patientController = require('../controller/patient.controller');
const authMiddleware = require('../middleware/auth');
router.get('/get-expert-doctors', patientController.ExpertDoctors);
router.post('/get-doctor-details', patientController.DoctorDetails);
router.get('/home-page',authMiddleware, patientController.HomePage);


module.exports = router;
