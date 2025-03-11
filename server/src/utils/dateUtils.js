/**
 * Standardizes timestamp handling across the application
 * Converts various timestamp formats to ISO string
 * 
 * @param {any} timestamp - The timestamp to standardize (Firestore Timestamp, Date object, or ISO string)
 * @param {boolean} [useCurrentTimeAsFallback=true] - Whether to use current time as fallback
 * @returns {string} - ISO string representation of the timestamp
 */
const standardizeTimestamp = (timestamp, useCurrentTimeAsFallback = true) => {
    try {
        if (!timestamp && !useCurrentTimeAsFallback) {
            return null;
        }

        if (!timestamp) {
            return new Date().toISOString();
        }

        // Handle Firestore Timestamp
        if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate().toISOString();
        }

        // Handle JavaScript Date
        if (timestamp instanceof Date) {
            return timestamp.toISOString();
        }

        // Handle ISO string
        if (typeof timestamp === 'string') {
            // Validate if it's a proper ISO string
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) {
                return timestamp;
            }
        }

        // Handle numeric timestamp (milliseconds since epoch)
        if (typeof timestamp === 'number') {
            return new Date(timestamp).toISOString();
        }

        // Fallback
        return useCurrentTimeAsFallback ? new Date().toISOString() : null;
    } catch (error) {
        console.error('Error standardizing timestamp:', error);
        return useCurrentTimeAsFallback ? new Date().toISOString() : null;
    }
};

module.exports = {
    standardizeTimestamp
}; 