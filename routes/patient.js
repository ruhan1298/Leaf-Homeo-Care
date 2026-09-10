var express = require('express');
var router = express.Router();
const patientController = require('../controller/patient.controller');
const authMiddleware = require('../middleware/auth');
const legalController = require('../controller/admin/legalController');

router.post('/get-expert-doctors', patientController.ExpertDoctors);
router.post('/get-doctor-details', patientController.DoctorDetails);
router.get('/home-page',authMiddleware, patientController.HomePage);
router.post('/send-notification',patientController.SendNotification);

// Public legal document routes (no authentication required)
router.get('/privacy-policy', legalController.GetPrivacyPolicy);
router.get('/terms-conditions', legalController.GetTermsConditions);

// router.post('/search',authMiddleware,patientController.Search)

module.exports = router;
