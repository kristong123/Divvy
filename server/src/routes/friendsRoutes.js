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
router.get("/requests/pending/:username", getPendingRequests);
router.get("/requests/sent/:username", getSentRequests);
router.get("/:userId/friends", getFriendsList);
router.put("/accept-request", acceptFriendRequest);
router.delete("/decline-request", declineFriendRequest);

module.exports = router;