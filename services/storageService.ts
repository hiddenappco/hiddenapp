import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads a file to Firebase Storage
 * @param path The path where the file will be stored
 * @param file The file object (Blob or File)
 * @returns The download URL of the uploaded file
 */
export const uploadFile = async (path: string, file: Blob | File): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
};

/**
 * Uploads a profile picture for a user
 * @param userId The ID of the user
 * @param file The image file
 * @returns The download URL
 */
export const uploadProfilePicture = async (userId: string, file: Blob | File): Promise<string> => {
    const path = `users/${userId}/profile.jpg`;
    return uploadFile(path, file);
};

export const deleteStorageFile = async (path: string): Promise<void> => {
    try {
        await deleteObject(ref(storage, path));
    } catch {
        /* object may already be deleted */
    }
};
