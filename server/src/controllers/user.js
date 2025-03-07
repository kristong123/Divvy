const cloudinary = require('cloudinary').v2;
const { db } = require('../config/firebase');

// Update the Cloudinary config section
try {
    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Missing Cloudinary credentials');
    }
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
} catch (error) {
    console.error('Cloudinary configuration error:', error);
}

// At the top, add a validation check
const validateCloudinaryConfig = () => {
    const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length) {
        console.error('Missing Cloudinary config:', missing);
        return false;
    }
    return true;
};

const updateProfilePicture = async (req, res) => {
    try {
        const { username } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        try {
            const uploadResponse = await cloudinary.uploader.upload(
                `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
                {
                    folder: 'profile_pictures',
                    public_id: `${username}-${Date.now()}`
                }
            ).catch(err => {
                console.error('Cloudinary upload error details:', err);
                throw err;
            });

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
            console.error('Upload error:', error);
            res.status(500).json({ message: error.message });
        }
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { updateProfilePicture }; 