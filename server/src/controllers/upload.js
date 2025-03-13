const { cloudinary } = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Upload a file to Cloudinary and return the URL
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with the uploaded file URL
 */
const uploadFile = async (req, res) => {
    try {
        const file = req.file;

        // Check if a file was uploaded
        if (!file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        console.log(`[uploadFile] Uploading file to Cloudinary`);

        // Verify Cloudinary configuration
        console.log(`[uploadFile] Cloudinary config check - cloud_name exists: ${!!process.env.CLOUDINARY_CLOUD_NAME}`);
        console.log(`[uploadFile] Cloudinary config check - api_key exists: ${!!process.env.CLOUDINARY_API_KEY}`);
        console.log(`[uploadFile] Cloudinary config check - api_secret exists: ${!!process.env.CLOUDINARY_API_SECRET}`);

        // Upload file to Cloudinary
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'chat_images',
                    public_id: `chat-image-${Date.now()}`,
                    resource_type: 'auto'
                },
                (error, result) => {
                    if (error) {
                        console.error('[uploadFile] Cloudinary upload error:', error);
                        return reject(error);
                    }
                    resolve(result);
                }
            );

            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });

        const uploadResult = await uploadPromise;

        // Store the Cloudinary URL
        const imageUrl = uploadResult.secure_url;

        // Log the URL for debugging
        console.log(`[uploadFile] Generated image URL: ${imageUrl}`);

        // Return the Cloudinary URL
        res.status(200).json({ url: imageUrl });
    } catch (error) {
        console.error('[uploadFile] Error uploading file:', error);
        res.status(500).json({ message: 'Failed to upload file', error: error.message });
    }
};

module.exports = { uploadFile }; 