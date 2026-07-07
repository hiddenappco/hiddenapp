import { Directory, Filesystem } from '@capacitor/filesystem';

const ROOT = 'trip-documents';

function sanitizeSegment(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'file';
}

export function buildTripDocumentLocalPath(tripId: string, docId: string, fileName: string): string {
    return `${ROOT}/${sanitizeSegment(tripId)}/${sanitizeSegment(docId)}_${sanitizeSegment(fileName)}`;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
}

async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || '');
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export async function saveTripDocumentLocal(
    localPath: string,
    file: Blob | File
): Promise<void> {
    const base64 = await blobToBase64(file);

    try {
        const parts = localPath.split('/');
        parts.pop();
        const dir = parts.join('/');
        if (dir) {
            await Filesystem.mkdir({ path: dir, directory: Directory.Data, recursive: true });
        }
    } catch {
        /* directory may already exist */
    }

    await Filesystem.writeFile({
        path: localPath,
        data: base64,
        directory: Directory.Data,
        recursive: true,
    });
}

export async function readTripDocumentLocalBlob(localPath: string, mimeType: string): Promise<Blob | null> {
    try {
        const result = await Filesystem.readFile({ path: localPath, directory: Directory.Data });
        const data = typeof result.data === 'string' ? result.data : '';
        if (!data) return null;
        return base64ToBlob(data, mimeType);
    } catch {
        return null;
    }
}

export async function readTripDocumentLocalObjectUrl(
    localPath: string,
    mimeType: string
): Promise<string | null> {
    const blob = await readTripDocumentLocalBlob(localPath, mimeType);
    if (!blob) return null;
    return URL.createObjectURL(blob);
}

export async function deleteTripDocumentLocal(localPath: string): Promise<void> {
    try {
        await Filesystem.deleteFile({ path: localPath, directory: Directory.Data });
    } catch {
        /* already removed */
    }
}

export async function deleteTripDocumentsForTrip(tripId: string): Promise<void> {
    const dir = `${ROOT}/${sanitizeSegment(tripId)}`;
    try {
        await Filesystem.rmdir({ path: dir, directory: Directory.Data, recursive: true });
    } catch {
        /* nothing to purge */
    }
}
