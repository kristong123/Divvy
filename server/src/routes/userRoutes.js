const express = require('express');
const router = express.Router();
const { updateProfilePicture, fixProfilePictureUrls } = require('../controllers/user');
const { upload } = require('../utils/multer');

router.post('/profile-picture', upload.single('image'), updateProfilePicture);
router.post('/fix-profile-picture-urls', fixProfilePictureUrls);

module.exports = router; 