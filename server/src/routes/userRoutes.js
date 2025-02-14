const express = require('express');
const router = express.Router();
const { updateProfilePicture } = require('../controllers/user');

router.post('/profile-picture', updateProfilePicture);

module.exports = router; 