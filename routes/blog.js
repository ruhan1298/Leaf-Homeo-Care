const express = require("express");
const router = express.Router();
const authmiddleware = require("../middleware/auth");
const blogController = require("../controller/admin/blogController");
const publicBlogController = require("../controller/blog.controller");

// Public blog routes for frontend developer (no auth required)
router.get("/blogs", publicBlogController.GetAllBlogs);
router.post("/blog-details", publicBlogController.GetBlogDetails);

// Admin blog routes (protected)
router.get("/get-blogs", authmiddleware, blogController.GetBlogs);
router.post("/get-blog", authmiddleware, blogController.GetBlogById);

module.exports = router;