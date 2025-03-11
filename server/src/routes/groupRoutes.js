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
    getUserGroups,
    getGroupInvites,
    declineGroupInvite,
    getInviteStatus,
    updateGroupImage,
    markGroupMessagesAsRead
} = require("../controllers/groups");
const { upload } = require("../utils/multer");

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
router.put("/:groupId/messages/read", markGroupMessagesAsRead);

// Invites
router.post("/invite", sendGroupInvite);
router.post("/join", joinGroup);
router.post("/invites/decline", declineGroupInvite);
router.get("/invites/:inviteId/status", getInviteStatus);

// Add event routes
router.put('/:groupId/event', setGroupEvent);

// Add this route
router.get("/:groupId/status", checkGroupStatus);

// Add this route to fetch group invites
router.get('/invites/:username', getGroupInvites);

// Add the route for uploading group images
router.post("/:groupId/image", upload.single('image'), updateGroupImage);

module.exports = router;