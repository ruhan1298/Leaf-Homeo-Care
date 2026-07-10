const express = require("express");
const router = express.Router();
const authmiddleware = require("../../middleware/auth");
const rbacMiddleware = require("../../middleware/rbacMiddleware");
const doctorController = require("../../controller/admin/doctorController");
const patientController = require("../../controller/admin/patientController");
const AppointmentController = require("../../controller/admin/appointmentController");
const dashboardController = require("../../controller/admin/dashboardController");
const upload = require("../../middleware/multer");

router.post("/add", authmiddleware, rbacMiddleware("admin"), doctorController.AddDoctor);
router.post("/getdoctors", authmiddleware, rbacMiddleware("admin"), doctorController.GetDoctors);
router.post("/delete", authmiddleware, rbacMiddleware("admin"), doctorController.DeleteDoctor);
router.post("/updatedoctor", authmiddleware, rbacMiddleware("admin"), upload.single("image"), doctorController.UpdateDoctor);

// Patient routes
router.post("/getpatients", authmiddleware, rbacMiddleware("admin"), patientController.GetAllPatients);
router.post("/deletepatient", authmiddleware, rbacMiddleware("admin"), patientController.DeletePatient);
router.post("/updatepatient", authmiddleware, rbacMiddleware("admin"), patientController.UpdatePatient);
router.post("/Appointments", authmiddleware, rbacMiddleware("admin"), AppointmentController.GetAppointments);
router.get("/dashboard-stats", authmiddleware, rbacMiddleware("admin"), dashboardController.GetDashboardStats);

module.exports = router;