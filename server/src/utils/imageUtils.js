const { cloudinary } = require('../config/cloudinary');

/**
 * Generates a placeholder image with the first letter of the name
 * @param {string} name - The name to use for the placeholder
 * @param {string} type - Either 'user' or 'group'
 * @param {string} id - Unique identifier for the user or group
 * @returns {Promise<string>} - URL of the generated placeholder image
 */
const generateLetterPlaceholder = async (name, type, id) => {
    try {
        if (!name || typeof name !== 'string') {
            console.error(`[generateLetterPlaceholder] Invalid name provided: ${name}`);
            return null;
        }

        // Get the first letter and make it uppercase
        const firstLetter = name.charAt(0).toUpperCase();

        // Use a consistent grey color for all placeholders
        const bgColor = '#6B7280'; // Tailwind gray-500

        // Create a unique identifier for the image
        const publicId = `${type}_placeholders/${type}-${id}-${Date.now()}`;

        // Generate SVG text
        const svg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}" rx="${type === 'user' ? '100' : '20'}" ry="${type === 'user' ? '100' : '20'}"/>
        <text x="50%" y="50%" dy=".1em" fill="white" font-family="Arial, sans-serif" font-size="120" 
              font-weight="bold" text-anchor="middle" dominant-baseline="middle">${firstLetter}</text>
      </svg>
    `;

        // Convert SVG to base64
        const base64Svg = Buffer.from(svg).toString('base64');
        const dataUri = `data:image/svg+xml;base64,${base64Svg}`;

        // Upload to Cloudinary
        console.log(`[generateLetterPlaceholder] Generating placeholder for ${type} ${id} with letter ${firstLetter}`);

        const uploadResult = await cloudinary.uploader.upload(dataUri, {
            public_id: publicId,
            folder: `${type}_placeholders`,
            resource_type: 'image'
        });

        console.log(`[generateLetterPlaceholder] Generated placeholder image: ${uploadResult.secure_url}`);

        return uploadResult.secure_url;
    } catch (error) {
        console.error(`[generateLetterPlaceholder] Error generating placeholder:`, error);
        return null;
    }
};

/**
 * Generates a user profile picture placeholder
 * @param {string} username - The username
 * @returns {Promise<string>} - URL of the generated placeholder image
 */
const generateUserPlaceholder = async (username) => {
    console.log(`[generateUserPlaceholder] Generating placeholder for user: ${username}`);
    const placeholderUrl = await generateLetterPlaceholder(username, 'user', username);
    console.log(`[generateUserPlaceholder] Generated placeholder URL: ${placeholderUrl}`);
    return placeholderUrl;
};

/**
 * Generates a group chat placeholder image
 * @param {string} groupName - The group name
 * @param {string} groupId - The group ID
 * @returns {Promise<string>} - URL of the generated placeholder image
 */
const generateGroupPlaceholder = async (groupName, groupId) => {
    return generateLetterPlaceholder(groupName, 'group', groupId);
};

module.exports = {
    generateUserPlaceholder,
    generateGroupPlaceholder
}; 