const express = require("express");
const router = express.Router();
const {
    sendMessage,
    getMessages,
    markMessagesAsRead,
    deleteMessage,
    //sendImageMessage
} = require("../controllers/messages");
const { upload } = require('../utils/multer');

// Message routes
router.post("/", sendMessage);
//router.post("/image", upload.single('image'), sendImageMessage);
router.get("/:chatId", getMessages);
router.put("/:chatId/read", markMessagesAsRead);
router.delete("/", deleteMessage);

module.exports = router;