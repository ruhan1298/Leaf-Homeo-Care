var express = require('express');
var router = express.Router();
const patientController = require('../controller/patient.controller');

router.get('/get-expert-doctors', patientController.ExpertDoctors);
router.post('/get-doctor-details', patientController.DoctorDetails);
router.post('/get-patient-profile', patientController.getPatientProfile);
router.post('/update-patient', patientController.updatePatient);
router.post('/delete-patient', patientController.deletePatient);
/* GET users listing. */



module.exports = router;
