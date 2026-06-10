const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");
const authController = require('../controller/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/user', authmiddleware, authController.GetUser);
router.post('/change-password', authmiddleware, authController.ChangePassword); 


module.exports = router;
