const express = require("express");
const router = express.Router();
const {
  getFriends,
  getPendingRequests,
  getSentRequests,
  addFriend,
  acceptFriend,
  declineFriend
} = require("../controllers/friends");

// Get routes
router.get("/:username", getFriends);
router.get("/requests/:username", getPendingRequests);
router.get("/sent/:username", getSentRequests);

// Action routes
router.post("/add", addFriend);
router.post("/accept", acceptFriend);
router.post("/decline", declineFriend);

module.exports = router;