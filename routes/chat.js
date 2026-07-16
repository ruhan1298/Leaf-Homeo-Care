const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {upload} = require ('../middleware/multer.js')
const chatController = require("../controller/chat.controller");

router.get("/history/:otherUserId", authMiddleware, chatController.getChatHistory);
router.get("/contacts", authMiddleware, chatController.getContacts);
router.get("/contact/:userId", authMiddleware, chatController.getContactById);
router.get("/appointment/:otherUserId", authMiddleware, chatController.getAppointmentContext);
// Temporarily disabled - frontend developer overwhelmed
// router.get("/prescription-templates", authMiddleware, chatController.getPrescriptionTemplates);
router.put("/message/:messageId", authMiddleware, chatController.editMessage);
router.delete("/message/:messageId", authMiddleware, chatController.deleteMessage);
// Temporarily disabled - frontend developer overwhelmed
// router.post("/upload", authMiddleware, upload.single("file"), chatController.uploadAttachment);
// router.post("/medical", authMiddleware, chatController.sendMedicalMessage);

module.exports = router;
