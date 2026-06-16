export function formatPackSize(sizeBytes?: number): string {
    if (!sizeBytes || sizeBytes <= 0) return '';
    if (sizeBytes < 1024 * 1024) {
        return `~${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
    }
    return `~${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
