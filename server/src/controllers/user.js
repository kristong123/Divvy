const { db } = require('../config/firebase');
const admin = require('firebase-admin');

const updateProfilePicture = async (req, res) => {
    try {
        const { username } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        try {
            // Upload file to Firebase Storage
            const bucket = admin.storage().bucket();
            const fileName = `profile_pictures/${username}-${Date.now()}`;
            const fileBuffer = file.buffer;
            const fileUpload = bucket.file(fileName);

            // Upload the file to Firebase Storage
            await fileUpload.save(fileBuffer, {
                metadata: {
                    contentType: file.mimetype
                }
            });

            // Store just the file path, not the full URL
            const filePath = fileName;

            // Generate the full URL for the response
            const bucketName = bucket.name.replace('.firebasestorage.app', '');
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

            // Log the path and URL for debugging
            console.log(`Storing file path: ${filePath}`);
            console.log(`Generated profile picture URL: ${publicUrl}`);

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
                const oldFilePath = userDoc.data().profilePicture;
                try {
                    // If the old path is a full URL, extract just the path
                    let oldFileName = oldFilePath;

                    if (oldFilePath.startsWith('http')) {
                        // Extract the file path from the URL - handle different URL formats
                        if (oldFilePath.includes('storage.googleapis.com')) {
                            // Standard Firebase Storage URL format
                            oldFileName = oldFilePath.split('/').slice(4).join('/');
                        } else if (oldFilePath.includes('firebasestorage.app')) {
                            // Alternative Firebase Storage URL format
                            oldFileName = oldFilePath.split('/').slice(3).join('/');
                        }
                    }

                    if (oldFileName) {
                        try {
                            // Delete the old file from Firebase Storage
                            await bucket.file(oldFileName).delete();
                            console.log(`Successfully deleted old profile picture: ${oldFileName}`);
                        } catch (deleteError) {
                            // Log the error but don't throw - allow the update to continue
                            console.error('Error deleting old profile picture:', deleteError);
                        }
                    }
                } catch (parseError) {
                    // If we can't parse the URL, just log and continue
                    console.error('Error parsing old profile picture URL:', parseError);
                }
            }

            // Update profile picture and updatedAt - store just the file path
            await db.collection('users').doc(username).update({
                profilePicture: filePath,
                updatedAt: new Date()
            });

            res.status(200).json({
                message: 'Profile picture updated',
                url: publicUrl,
                path: filePath
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