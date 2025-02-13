const express = require("express");
const { createGroupChat, sendGroupMessage, getGroupMessages, addUserToGroup, removeUserFromGroup, leaveGroup, deleteGroup, getGroupDetails, updateGroupChat, pinGroupMessage  } = require("../controllers/groupMessages");

const router = express.Router();

router.post("/create", createGroupChat);
router.post("/send", sendGroupMessage);
router.get("/:groupId/messages", getGroupMessages);
router.post("/add-user", addUserToGroup);
router.delete("/remove-user", removeUserFromGroup);
router.delete("/leave", leaveGroup);
router.delete("/delete", deleteGroup);
router.get("/:groupId", getGroupDetails);
router.put("/:groupId/update", updateGroupChat);
router.put("/:groupId/pin-message", pinGroupMessage);


module.exports = router;