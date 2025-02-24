const express = require("express");
const { login, signup } = require("../controllers/auth");

const router = express.Router();

// Add test route
router.get("/test", (req, res) => {
    res.json({ message: "Auth route working" });
});

// Update route paths to match client requests
router.post("/login", (req, res) => {
    login(req, res);
});

router.post("/signup", (req, res) => {
    signup(req, res);
});

module.exports = router;