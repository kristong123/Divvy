const express = require("express");
const { login, signup } = require("../controllers/auth");

const router = express.Router();

// Debug log
console.log('Setting up auth routes');

// Add test route
router.get("/test", (req, res) => {
    console.log('Test route hit');
    res.json({ message: "Auth route working" });
});

// Update route paths to match client requests
router.post("/login", (req, res) => {
    console.log('Login route hit');
    login(req, res);
});

router.post("/signup", (req, res) => {
    console.log('Signup route hit');
    signup(req, res);
});

module.exports = router;