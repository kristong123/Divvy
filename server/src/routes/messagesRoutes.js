const express = require("express");
const router = express.Router();
const {
    sendMessage,
    getMessages,
    markMessagesAsRead,
    deleteMessage
} = require("../controllers/messages");

// Message routes
router.post("/", sendMessage);
router.get("/:chatId", getMessages);
router.put("/:chatId/read", markMessagesAsRead);
router.delete("/", deleteMessage);

module.exports = router;