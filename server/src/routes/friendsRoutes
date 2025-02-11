const express = require("express");
const {sendFriendRequest,getPendingRequests, acceptFriendRequest,cancelFriendRequest,declineFriendRequest,getFriendsList,removeFriend} = require("../controllers/friends");

const router = express.Router();

router.post("/send-request", sendFriendRequest);
router.get("/:userId/pending-requests", getPendingRequests);
router.put("/accept-request", acceptFriendRequest);
router.delete("/cancel-request", cancelFriendRequest);
router.delete("/decline-request", declineFriendRequest);
router.get("/:userId/friends", getFriendsList);
router.delete("/remove", removeFriend);

module.exports = router;