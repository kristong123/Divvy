const express = require("express");
const { sendMessage, getMessages, markMessagesAsRead, deleteMessage } = require("../controllers/messages");

const router = express.Router();

router.post("/send", sendMessage);
router.get("/:chatId", getMessages);
router.put("/:chatId/mark-read", markMessagesAsRead);
router.delete("/:chatId/delete-message", deleteMessage);

module.exports = router;