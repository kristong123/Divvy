const express = require("express");
const { login, signup } = require("../controllers/auth"); 

const router = express.Router();

router.post("/login", login); // This will map to /api/auth/login
router.post("/signup", signup); // This will map to /api/auth/signup

module.exports = router;