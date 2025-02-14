const cloudinary = require('cloudinary').v2;
const { db } = require('../config/firebase');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const updateProfilePicture = async (req, res) => {
    try {
        const { username, image } = req.body;

        // Check if user exists in users collection
        const userDoc = await db.collection('users').doc(username).get();

        // Default user fields
        const defaultUserFields = {
            username: username,
            profilePicture: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (!userDoc.exists) {
            // Create new user document with all fields
            await db.collection('users').doc(username).set(defaultUserFields);
        } else {
            // Check for missing fields and update if necessary
            const userData = userDoc.data();
            const missingFields = {};

            Object.entries(defaultUserFields).forEach(([key, value]) => {
                if (userData[key] === undefined) {
                    missingFields[key] = value;
                }
            });

            // If there are missing fields, update the document
            if (Object.keys(missingFields).length > 0) {
                await db.collection('users').doc(username).update(missingFields);
            }
        }

        // Handle existing profile picture
        if (userDoc.exists && userDoc.data().profilePicture) {
            const oldImageUrl = userDoc.data().profilePicture;
            const publicId = oldImageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
        }

        // Upload new image
        const uploadResponse = await cloudinary.uploader.upload(image, {
            folder: 'profile_pictures',
            public_id: `${username}-${Date.now()}`
        });

        // Update profile picture and updatedAt
        await db.collection('users').doc(username).update({
            profilePicture: uploadResponse.secure_url,
            updatedAt: new Date()
        });

        res.status(200).json({
            message: 'Profile picture updated',
            url: uploadResponse.secure_url
        });
    } catch (error) {
        console.error('Detailed error:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = { updateProfilePicture }; 