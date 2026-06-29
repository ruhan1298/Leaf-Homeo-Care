const express = require("express");
const router = express.Router();
const authmiddleware = require("../../middleware/auth");  
const doctorController = require("../../controller/admin/doctorController");
const patientController = require("../../controller/admin/patientController");

router.post("/add", authmiddleware, doctorController.AddDoctor);
router.post("/getdoctors", authmiddleware, doctorController.GetDoctors);
router.post("/delete", authmiddleware, doctorController.DeleteDoctor);
router.post("/updatedoctor", authmiddleware, doctorController.UpdateDoctor);

// Patient routes
router.post("/getpatients", authmiddleware, patientController.GetAllPatients);
router.post("/deletepatient", authmiddleware, patientController.DeletePatient);
router.post("/updatepatient", authmiddleware, patientController.UpdatePatient);

module.exports = router;