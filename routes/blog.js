const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");
const blogController = require("../controller/admin/blogController");

// Public blog routes for authenticated users (patients and doctors)
router.get("/get-blogs", authmiddleware, blogController.GetBlogs);

module.exports = router;