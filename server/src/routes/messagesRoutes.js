const express = require("express");
const { sendMessage, getMessages, markMessagesAsRead, deleteMessage, acceptMessageRequest, rejectMessageRequest } = require("../controllers/messages");

const router = express.Router();

router.post("/send", sendMessage);
router.get("/:chatId", getMessages);
router.put("/:chatId/mark-read", markMessagesAsRead);
router.delete("/:chatId/delete-message", deleteMessage);

// New routes for message requests
router.post("/accept-request", acceptMessageRequest);
router.delete("/reject-request", rejectMessageRequest);

module.exports = router;