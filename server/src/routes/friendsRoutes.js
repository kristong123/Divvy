const express = require("express");
const router = express.Router();
const {
  sendFriendRequest,
  getPendingRequests,
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriendsList,
  removeFriend,
  getSentRequests
} = require("../controllers/friends");

router.post("/send-request", sendFriendRequest);
router.get("/:userId/pending-requests", getPendingRequests);
router.put("/accept-request", acceptFriendRequest);
router.delete("/cancel-request", cancelFriendRequest);
router.delete("/decline-request", declineFriendRequest);
router.get("/:userId/friends", getFriendsList);
router.delete("/remove", removeFriend);
router.get("/:userId/sent-requests", getSentRequests);

module.exports = router;