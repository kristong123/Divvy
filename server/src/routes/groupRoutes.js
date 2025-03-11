const express = require("express");
const { authenticateUser } = require("../middleware/authMiddleware");
const {
    createGroup,
    getUserGroups,
    addUserToGroup,
    removeUserFromGroup,
    leaveGroup,
    deleteGroup,
    getGroupDetails,
    updateGroupChat,
    sendGroupMessage,
    getGroupMessages,
    sendGroupInvite,
    joinGroup,
    setGroupEvent,
    checkGroupStatus,
    updateGroupImage,
    markGroupMessagesAsRead,
    getGroupInvites,
    declineGroupInvite,
    getInviteStatus
} = require("../controllers/groups");
const { upload } = require("../utils/multer");

const router = express.Router();

// Public routes (no authentication required)
router.get("/:groupId/status", checkGroupStatus);

// Protected routes (require Firebase authentication)
router.use(authenticateUser);

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
router.get("/invites/:username", getGroupInvites);
router.get("/invites/:inviteId/status", getInviteStatus);

// Events
router.put('/:groupId/event', setGroupEvent);

// Group image
router.post("/:groupId/image", upload.single('image'), updateGroupImage);

module.exports = router;