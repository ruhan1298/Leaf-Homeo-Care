const express = require("express");
const router = express.Router();
const legalController = require("../controller/legal.controller");

// Public routes - Get content
router.get("/terms", legalController.getTerms);
router.get("/privacy", legalController.getPrivacyPolicy);

// Admin routes - Update content (add auth middleware as needed)
router.put("/terms", legalController.updateTerms);
router.put("/privacy", legalController.updatePrivacyPolicy);
router.get("/all", legalController.getAllLegalContent);

module.exports = router;
