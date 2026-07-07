import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import axios from 'axios';
import { doc, getDoc } from 'firebase/firestore';
import { GEMMA_CONFIG } from '../config/gemma';
import { isGemmaArchiveUrl, resolveGemmaModelBytes } from '../utils/extractGemmaArchive';
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

/** Thrown when the downloaded payload is clearly not a model binary (HTML/JSON error page, placeholder). */
export const GEMMA_INVALID_FORMAT_ERROR = 'GEMMA_MODEL_INVALID_FORMAT';

/**
 * Rejects payloads that are obviously not the model binary — the most common
 * corruption cause is a download URL that returns an HTML/JSON error page or a
 * placeholder file. We deliberately only reject clear non-binary content to
 * avoid false negatives on the several valid MediaPipe container formats.
 */
function assertLooksLikeGemmaModel(head: Uint8Array): void {
    const probe = head.subarray(0, 64);
    const asText = String.fromCharCode(...probe).trim();
    const lower = asText.toLowerCase();
    if (
        lower.startsWith('<') || // HTML error page / XML
        lower.startsWith('{') || // JSON error payload
        asText.includes(GEMMA_CONFIG.placeholderMarker)
    ) {
        throw new Error(GEMMA_INVALID_FORMAT_ERROR);
    }
}

/**
 * Clears the installed-model flag and deletes the model files so the UI shows
 * "not installed" and the user can reinstall cleanly. Called when MediaPipe
 * rejects the file format or a corrupt download is detected.
 */
export async function markGemmaModelInvalid(): Promise<void> {
    try {
        localStorage.removeItem(GEMMA_CONFIG.storageKey);
    } catch {
        /* ignore */
    }
    const paths = [GEMMA_CONFIG.relativePath, GEMMA_CONFIG.tempPath, ...GEMMA_CONFIG.legacyPaths];
    for (const path of paths) {
        try {
            await Filesystem.deleteFile({ path, directory: Directory.Data });
        } catch {
            /* file may not exist */
        }
    }
}

/**
 * Bytes per filesystem write. Must be a multiple of 3 so each chunk's base64
 * has no interior padding (`=`), keeping the concatenated binary intact.
 * 3 MiB → ~4 MiB base64 string, far below V8's ~512 MB max string length.
 */
const WRITE_CHUNK_BYTES = 3 * 1024 * 1024;

/**
 * Writes a large binary to disk in base64 chunks. Converting the whole ~1.3 GB
 * model to a single base64 string overflows the JS engine's maximum string
 * length (RangeError: Invalid string length), so we append chunk by chunk.
 */
async function writeModelInChunks(
    bytes: Uint8Array,
    path: string,
    onWriteProgress?: (writtenBytes: number, totalBytes: number) => void,
    signal?: AbortSignal
): Promise<void> {
    try {
        await Filesystem.deleteFile({ path, directory: Directory.Data });
    } catch {
        /* no previous temp file */
    }

    const total = bytes.length;
    for (let offset = 0; offset < bytes.length; offset += WRITE_CHUNK_BYTES) {
        if (signal?.aborted) {
            throw new DOMException('GEMMA_INSTALL_ABORTED', 'AbortError');
        }

        const chunk = bytes.subarray(offset, offset + WRITE_CHUNK_BYTES);
        const base64Chunk = uint8ArrayToBase64(chunk);

        if (offset === 0) {
            await Filesystem.writeFile({
                path,
                data: base64Chunk,
                directory: Directory.Data,
                recursive: true,
            });
        } else {
            await Filesystem.appendFile({
                path,
                data: base64Chunk,
                directory: Directory.Data,
            });
        }

        const written = Math.min(offset + chunk.byteLength, total);
        onWriteProgress?.(written, total);

        // Yield so React can paint progress between heavy chunks.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
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

/** Install stages reported to the UI so the card never looks frozen at 100%. */
export type GemmaInstallPhase = 'streaming' | 'downloading' | 'extracting' | 'finalizing';

export type GemmaDownloadProgress = {
    phase: GemmaInstallPhase;
    /** 0–100 within the current phase (network and/or disk write). */
    phasePercent: number;
    /** Real bytes saved/downloaded so far, in MB (best-effort). */
    savedMb?: number;
    /** Total size in MB when known from Content-Length. */
    totalMb?: number;
};

const BYTES_PER_MB = 1024 * 1024;

/**
 * Streams the model from the network straight to disk, base64-encoding and
 * appending in `WRITE_CHUNK_BYTES` blocks. Memory stays bounded (~one block)
 * instead of buffering the whole ~1.3 GB model, which is the main cause of
 * out-of-memory crashes mid-install on low-RAM devices.
 *
 * @returns total bytes written, or `null` if streaming is unsupported here
 * (e.g. a runtime where `fetch` cannot expose a readable body).
 */
async function streamModelToDisk(
    url: string,
    path: string,
    onProgress: (savedBytes: number, totalBytes: number) => void,
    signal?: AbortSignal
): Promise<number | null> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`GEMMA_DOWNLOAD_HTTP_${response.status}`);
    }
    if (!response.body) {
        return null; // No streaming support → caller falls back to buffered path.
    }

    try {
        await Filesystem.deleteFile({ path, directory: Directory.Data });
    } catch {
        /* no previous temp file */
    }

    const totalBytes = Number(response.headers.get('content-length')) || 0;
    const reader = response.body.getReader();

    let firstWrite = true;
    let writtenBytes = 0;
    let receivedBytes = 0;
    let pending: Uint8Array[] = [];
    let pendingBytes = 0;

    const writeBlock = async (block: Uint8Array): Promise<void> => {
        if (firstWrite) {
            assertLooksLikeGemmaModel(block);
        }
        const base64Chunk = uint8ArrayToBase64(block);
        if (firstWrite) {
            await Filesystem.writeFile({ path, data: base64Chunk, directory: Directory.Data, recursive: true });
            firstWrite = false;
        } else {
            await Filesystem.appendFile({ path, data: base64Chunk, directory: Directory.Data });
        }
        writtenBytes += block.byteLength;
    };

    // Only the final flush may be a non-multiple of 3 bytes; every intermediate
    // block is exactly WRITE_CHUNK_BYTES (divisible by 3) so the concatenated
    // base64 has no interior padding and decodes back to the original bytes.
    const drain = async (final: boolean): Promise<void> => {
        if (pendingBytes === 0) return;
        const merged = new Uint8Array(pendingBytes);
        let offset = 0;
        for (const part of pending) {
            merged.set(part, offset);
            offset += part.byteLength;
        }
        let pos = 0;
        while (pendingBytes - pos >= WRITE_CHUNK_BYTES) {
            await writeBlock(merged.subarray(pos, pos + WRITE_CHUNK_BYTES));
            pos += WRITE_CHUNK_BYTES;
        }
        if (final && pos < pendingBytes) {
            await writeBlock(merged.subarray(pos));
            pos = pendingBytes;
        }
        const remainder = merged.subarray(pos);
        pending = remainder.byteLength ? [remainder.slice()] : [];
        pendingBytes = remainder.byteLength;
    };

    for (;;) {
        if (signal?.aborted) {
            throw new DOMException('GEMMA_INSTALL_ABORTED', 'AbortError');
        }
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength) {
            pending.push(value);
            pendingBytes += value.byteLength;
            receivedBytes += value.byteLength;
            if (pendingBytes >= WRITE_CHUNK_BYTES) {
                await drain(false);
            }
            onProgress(receivedBytes, totalBytes);
            // Yield so the UI can paint between heavy blocks.
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
    }
    await drain(true);

    if (firstWrite) {
        // Zero-byte response: create the file so the size check fails cleanly.
        await Filesystem.writeFile({ path, data: '', directory: Directory.Data, recursive: true });
    }

    return writtenBytes;
}

async function bufferedDownloadToDisk(
    downloadUrl: string,
    onProgress: (progress: GemmaDownloadProgress) => void,
    onPhase: ((phase: GemmaInstallPhase) => void) | undefined,
    signal: AbortSignal | undefined
): Promise<number> {
    onPhase?.('downloading');
    onProgress({ phase: 'downloading', phasePercent: 0 });

    const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        signal,
        onDownloadProgress: (event) => {
            const total = event.total || 0;
            const loaded = event.loaded || 0;
            const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
            onProgress({
                phase: 'downloading',
                phasePercent: percent,
                savedMb: Math.round(loaded / BYTES_PER_MB),
                totalMb: total > 0 ? Math.round(total / BYTES_PER_MB) : undefined,
            });
        },
    });

    if (signal?.aborted) {
        throw new DOMException('GEMMA_INSTALL_ABORTED', 'AbortError');
    }

    onPhase?.('extracting');
    onProgress({ phase: 'extracting', phasePercent: 0 });

    const modelBytes = resolveGemmaModelBytes(downloadUrl, response.data);
    const sizeBytes = modelBytes.byteLength;
    if (sizeBytes < GEMMA_CONFIG.minBytes) {
        throw new Error('GEMMA_MODEL_TOO_SMALL');
    }
    assertLooksLikeGemmaModel(modelBytes);

    onPhase?.('finalizing');
    onProgress({ phase: 'finalizing', phasePercent: 0 });

    await writeModelInChunks(
        modelBytes,
        GEMMA_CONFIG.tempPath,
        (written, total) => {
            const phasePercent = total > 0 ? Math.round((written / total) * 100) : 0;
            onProgress({
                phase: 'finalizing',
                phasePercent,
                savedMb: Math.round(written / BYTES_PER_MB),
                totalMb: Math.round(total / BYTES_PER_MB),
            });
        },
        signal
    );

    return sizeBytes;
}

export async function downloadGemmaModel(
    onProgress: (progress: GemmaDownloadProgress) => void,
    onPhase?: (phase: GemmaInstallPhase) => void,
    signal?: AbortSignal
): Promise<{ sizeBytes: number }> {
    const downloadUrl = await getGemmaDownloadUrl();
    let sizeBytes = 0;

    // `.tar.gz` archives need the whole payload in memory to gunzip, so they use
    // the buffered path. Direct `.bin` URLs stream to disk to keep RAM low.
    const canStream = !isGemmaArchiveUrl(downloadUrl);

    if (canStream) {
        onPhase?.('streaming');
        onProgress({ phase: 'streaming', phasePercent: 0 });

        const streamed = await streamModelToDisk(
            downloadUrl,
            GEMMA_CONFIG.tempPath,
            (savedBytes, totalBytes) => {
                const percent = totalBytes > 0 ? Math.round((savedBytes / totalBytes) * 100) : 0;
                onProgress({
                    phase: 'streaming',
                    phasePercent: percent,
                    savedMb: Math.round(savedBytes / BYTES_PER_MB),
                    totalMb: totalBytes > 0 ? Math.round(totalBytes / BYTES_PER_MB) : undefined,
                });
            },
            signal
        );

        if (streamed === null) {
            // Runtime without streaming bodies → buffered fallback.
            sizeBytes = await bufferedDownloadToDisk(downloadUrl, onProgress, onPhase, signal);
        } else {
            sizeBytes = streamed;
        }
    } else {
        sizeBytes = await bufferedDownloadToDisk(downloadUrl, onProgress, onPhase, signal);
    }

    if (signal?.aborted) {
        throw new DOMException('GEMMA_INSTALL_ABORTED', 'AbortError');
    }
    if (sizeBytes < GEMMA_CONFIG.minBytes) {
        throw new Error('GEMMA_MODEL_TOO_SMALL');
    }

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

export async function removeGemmaModel(
    onProgress?: (deleted: number, total: number) => void
): Promise<void> {
    localStorage.removeItem(GEMMA_CONFIG.storageKey);

    const paths = [GEMMA_CONFIG.relativePath, GEMMA_CONFIG.tempPath, ...GEMMA_CONFIG.legacyPaths];
    let deleted = 0;
    for (const path of paths) {
        try {
            await Filesystem.deleteFile({ path, directory: Directory.Data });
        } catch {
            /* ignore */
        }
        deleted += 1;
        onProgress?.(deleted, paths.length);
    }
}

/** Drops incomplete temp files after a killed install or failed write. */
export async function cleanupPartialGemmaInstall(): Promise<void> {
    localStorage.removeItem(GEMMA_CONFIG.storageKey);
    for (const path of [GEMMA_CONFIG.tempPath, ...GEMMA_CONFIG.legacyPaths]) {
        try {
            await Filesystem.deleteFile({ path, directory: Directory.Data });
        } catch {
            /* ignore */
        }
    }
}
