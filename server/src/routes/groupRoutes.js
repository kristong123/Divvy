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
    createGroup,
    sendGroupInvite,
    joinGroup,
    setGroupEvent,
    checkGroupStatus,
    getUserGroups
} = require("../controllers/groups");

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

// Invites
router.post("/invite", sendGroupInvite);
router.post("/join", joinGroup);

// Add event routes
router.put('/:groupId/event', setGroupEvent);

// Add this route
router.get("/:groupId/status", checkGroupStatus);

module.exports = router;