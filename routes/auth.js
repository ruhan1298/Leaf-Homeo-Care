const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");
const authController = require('../controller/auth.controller');
const { upload } = require('../middleware/multer');
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/get-user', authmiddleware, authController.GetUser);
router.post('/update-profile', upload.single('image'), authmiddleware, authController.UpdateProfile);
router.post('/change-password', authmiddleware, authController.ChangePassword);
router.post('/complete-profile', upload.single('image'), authmiddleware, authController.CompleteProfile);
router.post('/forgot-password', authController.ForgetPassword);
router.post('/verify-otp', authController.VerifyOTP);
router.post('/reset-password', authController.ResetPassword);
router.post('/setup-password', authController.SetupPassword);
router.get('/delete-user', authmiddleware, authController.DeleteUser);
router.get('/get-notifications', authmiddleware, authController.NotificationList);
router.delete('/notification/:notificationId', authmiddleware, authController.DeleteNotification);
router.delete('/truncate-notifications', authmiddleware, authController.TruncateNotifications);
router.post('/add-token',authmiddleware,authController.UpdateFcmToken)
// Phone verification routes
router.post('/send-phone-otp', authController.SendPhoneOTP);
router.post('/verify-phone-otp', authController.VerifyPhoneOTP);
// Terms and conditions route
router.get('/terms-conditions', authController.GetTermsConditions);
module.exports = router;
