var express = require('express');
var router = express.Router();
const patientController = require('../controller/patient.controller');

router.get('/get-expert-doctors', patientController.ExpertDoctors);
router.post('/get-doctor-details', patientController.DoctorDetails);

module.exports = router;
