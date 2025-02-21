const express = require("express");
const {
    sendGroupMessage,
    getGroupMessages,
    addUserToGroup,
    removeUserFromGroup,
    leaveGroup,
    deleteGroup,
    getGroupDetails,
    updateGroupChat,
    pinGroupMessage,
    createGroup,
    sendGroupInvite,
    joinGroup,
    setGroupEvent
} = require("../controllers/groupMessages");
const { getUserGroups } = require('../controllers/groups');

const router = express.Router();

// Group management
router.post('/create', createGroup);
router.get('/user/:username', getUserGroups);
router.get("/:groupId", getGroupDetails);
router.put("/:groupId/update", updateGroupChat);
router.delete("/delete", deleteGroup);

// Member management
router.post("/add-user", addUserToGroup);
router.delete("/remove-user", removeUserFromGroup);
router.delete("/leave", leaveGroup);

// Messages
router.post("/:groupId/messages", sendGroupMessage);
router.get("/:groupId/messages", getGroupMessages);
router.put("/:groupId/pin-message", pinGroupMessage);

// Invites
router.post("/invite", sendGroupInvite);
router.post("/join", joinGroup);

// Add event routes
router.put('/:groupId/event', setGroupEvent);

module.exports = router;