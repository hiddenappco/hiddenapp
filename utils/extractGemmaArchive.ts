import { gunzipSync } from 'fflate';

/** Extract the first `.bin` member from a tar archive (Kaggle / Firebase `.tar.gz`). */
function extractBinFromTar(tar: Uint8Array): Uint8Array {
    let offset = 0;

    while (offset + 512 <= tar.length) {
        const header = tar.subarray(offset, offset + 512);
        if (header.every((byte) => byte === 0)) break;

        const nameEnd = header.indexOf(0);
        const name = new TextDecoder().decode(header.subarray(0, nameEnd > 0 ? nameEnd : 100)).trim();
        const sizeOctal = new TextDecoder().decode(header.subarray(124, 136)).replace(/\0/g, '').trim();
        const size = Number.parseInt(sizeOctal, 8) || 0;
        const typeFlag = header[156];

        offset += 512;
        const dataEnd = offset + size;
        const isRegularFile = typeFlag === 0 || typeFlag === 48 || typeFlag === 0x30;

        if (isRegularFile && size > 0 && name.endsWith('.bin')) {
            return tar.slice(offset, dataEnd);
        }

        offset = dataEnd + ((512 - (size % 512)) % 512);
    }

    throw new Error('GEMMA_BIN_NOT_FOUND_IN_ARCHIVE');
}

export function isGemmaArchiveUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('.tar.gz') || lower.includes('.tgz');
}

export function resolveGemmaModelBytes(downloadUrl: string, payload: ArrayBuffer): Uint8Array {
    if (!isGemmaArchiveUrl(downloadUrl)) {
        return new Uint8Array(payload);
    }

    const tarBytes = gunzipSync(new Uint8Array(payload));
    return extractBinFromTar(tarBytes);
}
