
/**
 * Helper to normalize image URLs from Firestore/Rowy
 * Rowy often stores images as an array of objects: [{ downloadURL: "...", ... }]
 * The App expects a simple string URL.
 */
export const normalizeImage = (imageField: any): string => {
    if (!imageField) return '';

    // Case 1: Standard string URL
    if (typeof imageField === 'string') {
        return imageField;
    }

    // Case 2: Rowy Array of Files
    if (Array.isArray(imageField) && imageField.length > 0) {
        const firstImage = imageField[0];
        if (firstImage && typeof firstImage === 'object' && firstImage.downloadURL) {
            return firstImage.downloadURL;
        }
        // Fallback if structure is different but still array
        if (typeof firstImage === 'string') {
            return firstImage;
        }
    }

    // Case 3: Single Object (less common but possible)
    if (typeof imageField === 'object' && imageField.downloadURL) {
        return imageField.downloadURL;
    }

    return '';
};
