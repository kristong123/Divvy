const { db } = require('../config/firebase');
const { cloudinary } = require('../config/cloudinary');
const streamifier = require('streamifier');

const updateProfilePicture = async (req, res) => {
    try {
        const { username } = req.body;
        const file = req.file;

        console.log(`[updateProfilePicture] Received request for user: ${username}`);

        // Check if a file was uploaded
        if (!file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        let imageUrl;

        try {
            // Upload file to Cloudinary
            console.log(`[updateProfilePicture] Uploading file to Cloudinary for user: ${username}`);
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'profile_pictures',
                        public_id: `${username}-${Date.now()}`,
                        resource_type: 'auto'
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );

                streamifier.createReadStream(file.buffer).pipe(uploadStream);
            });

            const uploadResult = await uploadPromise;

            // Store the Cloudinary URL
            imageUrl = uploadResult.secure_url;

            // Log the URL for debugging
            console.log(`[updateProfilePicture] Generated profile picture URL: ${imageUrl}`);
            console.log(`[updateProfilePicture] Cloudinary public_id: ${uploadResult.public_id}`);
        } catch (uploadError) {
            console.error(`[updateProfilePicture] Error uploading to Cloudinary:`, uploadError);
            return res.status(500).json({ message: 'Error uploading image to Cloudinary' });
        }

        // Check if user exists in users collection
        const userDoc = await db.collection('users').doc(username).get();

        // Log the current user data
        if (userDoc.exists) {
            console.log(`[updateProfilePicture] Current user data:`, userDoc.data());
            console.log(`[updateProfilePicture] Current profile picture:`, userDoc.data().profilePicture);
        } else {
            console.log(`[updateProfilePicture] User ${username} does not exist yet`);
        }

        // Default user fields
        const defaultUserFields = {
            username: username,
            profilePicture: imageUrl,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // If user doesn't exist, create a new document
        if (!userDoc.exists) {
            console.log(`[updateProfilePicture] User ${username} not found, creating new user document`);
            await db.collection('users').doc(username).set(defaultUserFields);
        } else {
            console.log(`[updateProfilePicture] User ${username} found, updating profile picture`);

            // Get the current user data
            const userData = userDoc.data();

            // Delete old profile picture if it exists
            if (userData.profilePicture) {
                const oldImageUrl = userData.profilePicture;
                try {
                    // If the old URL is a Cloudinary URL, extract the public ID and delete it
                    if (oldImageUrl && oldImageUrl.includes('cloudinary.com')) {
                        console.log(`[updateProfilePicture] Detected Cloudinary URL, extracting public ID`);

                        // Extract the public ID from the Cloudinary URL
                        // Format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext
                        const urlParts = oldImageUrl.split('/');
                        const fileNameWithExtension = urlParts[urlParts.length - 1];
                        const fileName = fileNameWithExtension.split('.')[0];

                        // If there's a query string, remove it
                        const publicId = fileName.split('?')[0];

                        if (!publicId) {
                            throw new Error('Invalid Cloudinary URL format');
                        }

                        // For folder structure, we need to include the folder name
                        // Find the upload part in the URL
                        const uploadIndex = urlParts.findIndex(part => part === 'upload');
                        if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
                            // Get everything after "upload" except the version number (which starts with v)
                            const folderParts = urlParts.slice(uploadIndex + 1).filter(part => !part.startsWith('v'));
                            // Join all parts except the last one (which is the filename)
                            const folderPath = folderParts.slice(0, -1).join('/');

                            // Combine folder path and filename for the complete public ID
                            const fullPublicId = folderPath ? `${folderPath}/${publicId}` : publicId;

                            console.log(`[updateProfilePicture] Extracted public ID: ${fullPublicId}`);

                            try {
                                const deleteResult = await cloudinary.uploader.destroy(fullPublicId);
                                console.log(`[updateProfilePicture] Cloudinary deletion result:`, deleteResult);

                                if (deleteResult.result === 'ok') {
                                    console.log(`[updateProfilePicture] Successfully deleted old profile picture: ${fullPublicId}`);
                                } else {
                                    console.log(`[updateProfilePicture] Cloudinary reported non-success: ${deleteResult.result}`);
                                }
                            } catch (deleteError) {
                                console.error(`[updateProfilePicture] Error deleting old profile picture:`, deleteError);
                                // Continue with the update even if deletion fails
                            }
                        } else {
                            console.log(`[updateProfilePicture] Could not determine folder structure in URL: ${oldImageUrl}`);
                        }
                    } else {
                        console.log(`[updateProfilePicture] Old image URL is not from Cloudinary, skipping deletion`);
                    }
                } catch (parseError) {
                    console.error(`[updateProfilePicture] Error parsing old profile picture URL:`, parseError);
                    // Continue with the update even if parsing fails
                }
            }

            // Update the user document with the new profile picture
            await db.collection('users').doc(username).update({
                profilePicture: imageUrl,
                updatedAt: new Date()
            });
        }

        // Get the socket instance
        const io = require('../config/socket').getIO();

        // Emit a socket event to notify clients about the profile picture update
        if (io) {
            io.emit('profile-picture-updated', {
                username,
                imageUrl
            });
            console.log(`[updateProfilePicture] Emitted profile-picture-updated event for ${username}`);
        }

        res.status(200).json({
            message: 'Profile picture updated successfully',
            path: imageUrl
        });
    } catch (error) {
        console.error(`[updateProfilePicture] Error updating profile picture:`, error);
        res.status(500).json({ message: 'Error updating profile picture' });
    }
};

/**
 * Fix incorrect profile picture URLs in the database
 * This is a utility function to fix URLs that were generated with the wrong format
 */
const fixProfilePictureUrls = async (req, res) => {
    try {
        // Get all users
        const usersSnapshot = await db.collection('users').get();

        if (usersSnapshot.empty) {
            return res.status(200).json({ message: 'No users found' });
        }

        const updates = [];

        // Check each user's profile picture URL
        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();

            if (userData.profilePicture && userData.profilePicture.includes('storage.googleapis.com/divvy-14457.firebasestorage.app')) {
                // This is an incorrect URL format
                console.log(`Found incorrect URL format for user ${doc.id}: ${userData.profilePicture}`);

                // Fix the URL by removing the .firebasestorage.app part
                const fixedUrl = userData.profilePicture.replace(
                    'storage.googleapis.com/divvy-14457.firebasestorage.app',
                    'storage.googleapis.com/divvy-14457'
                );

                console.log(`Fixed URL: ${fixedUrl}`);

                // Update the user document
                updates.push(
                    db.collection('users').doc(doc.id).update({
                        profilePicture: fixedUrl,
                        updatedAt: new Date()
                    })
                );
            }
        }

        // Apply all updates
        if (updates.length > 0) {
            await Promise.all(updates);
            return res.status(200).json({
                message: `Fixed ${updates.length} profile picture URLs`
            });
        }

        return res.status(200).json({ message: 'No URLs needed fixing' });
    } catch (error) {
        console.error('Error fixing profile picture URLs:', error);
        return res.status(500).json({ message: 'Error fixing profile picture URLs' });
    }
};

module.exports = {
    updateProfilePicture,
    fixProfilePictureUrls
}; 