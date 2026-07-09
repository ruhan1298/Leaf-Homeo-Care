const express = require("express");
const router = express.Router();
const authmiddleware = require("../../middleware/auth");  
const doctorController = require("../../controller/admin/doctorController");
const patientController = require("../../controller/admin/patientController");
const AppointmentController = require("../../controller/admin/appointmentController");
const dashboardController = require("../../controller/admin/dashboardController");
 const upload = require("../../middleware/multer");

router.post("/add", authmiddleware, doctorController.AddDoctor);
router.post("/getdoctors", authmiddleware, doctorController.GetDoctors);
router.post("/delete", authmiddleware, doctorController.DeleteDoctor);
router.post("/updatedoctor",  authmiddleware, upload.single("image"), doctorController.UpdateDoctor);

// Patient routes
router.post("/getpatients", authmiddleware, patientController.GetAllPatients);
router.post("/deletepatient", authmiddleware, patientController.DeletePatient);
router.post("/updatepatient", authmiddleware, patientController.UpdatePatient);
router.post("/Appointments", authmiddleware, AppointmentController.GetAppointments);
router.get("/dashboard-stats", authmiddleware, dashboardController.GetDashboardStats);

module.exports = router;