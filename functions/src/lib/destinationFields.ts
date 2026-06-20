type RawDoc = Record<string, unknown>;

export function normalizeDestinationStats(raw: RawDoc): {
    hiking: string;
    temp: string;
    signal: string;
} {
    const stats = (raw.stats as Record<string, unknown>) || {};
    return {
        hiking: String(
            raw.statsHiking || stats.hikingLevel || stats.hiking || raw.hikingLevel || '--'
        ),
        temp: String(
            raw.statsTemp || stats.temperature || stats.temp || raw.statsTemperature || raw.temperature || '--'
        ),
        signal: String(raw.statsSignal || stats.signal || raw.signal || '--'),
    };
}

export function normalizeDestinationCoordinates(
    raw: RawDoc
): { lat: number; lng: number } | null {
    const coords = raw.coordinates as
        | { latitude?: number; longitude?: number; lat?: number; lng?: number }
        | undefined;
    if (!coords) return null;
    const lat = coords.latitude ?? coords.lat;
    const lng = coords.longitude ?? coords.lng;
    if (lat == null || lng == null) return null;
    return { lat: Number(lat), lng: Number(lng) };
}
