const express = require('express');
const router = express.Router();
const { updateProfilePicture } = require('../controllers/user');
const { upload } = require('../utils/multer');

router.post('/profile-picture', upload.single('image'), updateProfilePicture);

module.exports = router; 