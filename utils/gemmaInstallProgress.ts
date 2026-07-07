/**
 * Overall install progress bands (0–100) for the Gemma engine card.
 *
 * Primary path is a streamed download that writes to disk while it downloads,
 * so download + save share one band (0–90). The legacy buffered path (used as
 * a fallback or for `.tar.gz` archives) splits that band into download/write.
 */
export const GEMMA_INSTALL_PROGRESS = {
    /** Streamed download+save occupies 0–90. */
    streamEnd: 90,
    /** Buffered fallback: network download portion. */
    archiveDownloadEnd: 45,
    archiveWriteStart: 45,
    archiveWriteEnd: 90,
    verifyStart: 90,
    verifyMid: 96,
    complete: 100,
} as const;

/** No chunk progress for this long → stalled install (ms). */
export const GEMMA_INSTALL_STALL_MS = 8 * 60 * 1000;

/** Hard cap for the whole install flow (ms). */
export const GEMMA_INSTALL_TOTAL_TIMEOUT_MS = 45 * 60 * 1000;

function clampPercent(percent: number): number {
    return Math.max(0, Math.min(100, percent));
}

/** Streamed download+save percent → overall (0–90). */
export function mapStreamProgressToOverall(streamPercent: number): number {
    return Math.round((clampPercent(streamPercent) / 100) * GEMMA_INSTALL_PROGRESS.streamEnd);
}

/** Buffered fallback: network download percent → overall (0–45). */
export function mapArchiveDownloadToOverall(networkPercent: number): number {
    return Math.round((clampPercent(networkPercent) / 100) * GEMMA_INSTALL_PROGRESS.archiveDownloadEnd);
}

/** Buffered fallback: disk write percent → overall (45–90). */
export function mapArchiveWriteToOverall(writePercent: number): number {
    const span = GEMMA_INSTALL_PROGRESS.archiveWriteEnd - GEMMA_INSTALL_PROGRESS.archiveWriteStart;
    return GEMMA_INSTALL_PROGRESS.archiveWriteStart + Math.round((clampPercent(writePercent) / 100) * span);
}

export function formatInstallElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
