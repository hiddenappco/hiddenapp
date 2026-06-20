import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import axios from 'axios';
import { doc, getDoc } from 'firebase/firestore';
import { GEMMA_CONFIG } from '../config/gemma';
import { resolveGemmaModelBytes } from '../utils/extractGemmaArchive';
import { db } from './firebase';

export class GemmaDownloadUrlMissingError extends Error {
    constructor() {
        super('GEMMA_DOWNLOAD_URL_MISSING');
        this.name = 'GemmaDownloadUrlMissingError';
    }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

export async function getGemmaDownloadUrl(): Promise<string> {
    if (GEMMA_CONFIG.downloadUrl) return GEMMA_CONFIG.downloadUrl;

    try {
        const snap = await getDoc(doc(db, 'config', GEMMA_CONFIG.firestoreConfigDoc));
        const url = snap.data()?.downloadUrl;
        if (typeof url === 'string' && url.startsWith('http')) {
            return url;
        }
    } catch (err) {
        console.warn('[GemmaModel] Could not read Firestore config:', err);
    }

    if (GEMMA_CONFIG.storageDownloadUrl) {
        return GEMMA_CONFIG.storageDownloadUrl;
    }

    throw new GemmaDownloadUrlMissingError();
}

export async function getGemmaModelSizeBytes(): Promise<number> {
    try {
        const stat = await Filesystem.stat({
            path: GEMMA_CONFIG.relativePath,
            directory: Directory.Data,
        });
        return stat.size ?? 0;
    } catch {
        return 0;
    }
}

export async function isGemmaModelReady(): Promise<boolean> {
    const flagged = localStorage.getItem(GEMMA_CONFIG.storageKey) === 'true';
    if (!flagged) return false;
    const size = await getGemmaModelSizeBytes();
    return size >= GEMMA_CONFIG.minBytes;
}

export async function resolveGemmaModelAssetPath(): Promise<string> {
    const { uri } = await Filesystem.getUri({
        path: GEMMA_CONFIG.relativePath,
        directory: Directory.Data,
    });
    return Capacitor.convertFileSrc(uri);
}

export async function downloadGemmaModel(
    onProgress: (percent: number) => void
): Promise<{ sizeBytes: number }> {
    const downloadUrl = await getGemmaDownloadUrl();

    const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        onDownloadProgress: (event) => {
            const total = event.total || 0;
            const loaded = event.loaded || 0;
            const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
            onProgress(percent);
        },
    });

    const modelBytes = resolveGemmaModelBytes(downloadUrl, response.data);
    const sizeBytes = modelBytes.byteLength;
    if (sizeBytes < GEMMA_CONFIG.minBytes) {
        throw new Error('GEMMA_MODEL_TOO_SMALL');
    }

    const base64Data = uint8ArrayToBase64(modelBytes);

    await Filesystem.writeFile({
        path: GEMMA_CONFIG.tempPath,
        data: base64Data,
        directory: Directory.Data,
        recursive: true,
    });

    await Filesystem.rename({
        from: GEMMA_CONFIG.tempPath,
        to: GEMMA_CONFIG.relativePath,
        directory: Directory.Data,
    });

    for (const legacy of GEMMA_CONFIG.legacyPaths) {
        try {
            await Filesystem.deleteFile({ path: legacy, directory: Directory.Data });
        } catch {
            /* ignore */
        }
    }

    localStorage.setItem(GEMMA_CONFIG.storageKey, 'true');
    return { sizeBytes };
}

export async function removeGemmaModel(): Promise<void> {
    localStorage.removeItem(GEMMA_CONFIG.storageKey);

    const paths = [GEMMA_CONFIG.relativePath, GEMMA_CONFIG.tempPath, ...GEMMA_CONFIG.legacyPaths];
    for (const path of paths) {
        try {
            await Filesystem.deleteFile({ path, directory: Directory.Data });
        } catch {
            /* ignore */
        }
    }
}
