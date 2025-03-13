const express = require('express');
const router = express.Router();
const { uploadFile } = require('../controllers/upload');
const { upload } = require('../utils/multer');

// Route for general file uploads
router.post('/', upload.single('file'), uploadFile);

module.exports = router; 