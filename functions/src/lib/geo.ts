/**
 * Normaliza coordenadas desde Firestore (GeoPoint, {lat,lng}, {latitude,longitude}).
 */
export function normalizeCoordinates(raw: unknown): { lat: number; lng: number } | null {
    if (!raw || typeof raw !== "object") return null;
    const c = raw as Record<string, unknown>;
    const lat = c.lat ?? c.latitude;
    const lng = c.lng ?? c.longitude;
    if (typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
    }
    return null;
}

export function mapDestinationForAgent(id: string, data: Record<string, unknown>) {
    const coords = normalizeCoordinates(data.coordinates);
    return {
        ...data,
        id,
        coordinates: coords,
    };
}

const normalizeText = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function findDestinationCoords(
    destinations: Array<Record<string, unknown>>,
    opts: {
        destinationId?: string;
        destinationName?: string;
        destinationLat?: number;
        destinationLng?: number;
    }
): { lat: number; lng: number; matchedId?: string; matchedName?: string } | null {
    const fromArgs = normalizeCoordinates({
        lat: opts.destinationLat,
        lng: opts.destinationLng,
    });
    if (fromArgs) return { ...fromArgs };

    if (opts.destinationId) {
        const idNorm = normalizeText(opts.destinationId);
        const byId = destinations.find((d) => {
            const docId = normalizeText(String(d.id || ""));
            const customId = normalizeText(String(d.customId || d.id || ""));
            return docId === idNorm || customId === idNorm || docId.includes(idNorm) || idNorm.includes(docId);
        });
        const coords = byId ? normalizeCoordinates(byId.coordinates) : null;
        if (coords) {
            return {
                ...coords,
                matchedId: String(byId!.id || opts.destinationId),
                matchedName: String(byId!.title || byId!.name || ""),
            };
        }
    }

    if (opts.destinationName) {
        const q = normalizeText(opts.destinationName);
        const found = destinations.find((d) => {
            const name = normalizeText(String(d.title || d.name || ""));
            return name.includes(q) || q.includes(name);
        });
        const coords = found ? normalizeCoordinates(found.coordinates) : null;
        if (coords) {
            return {
                ...coords,
                matchedId: String(found!.id || ""),
                matchedName: String(found!.title || found!.name || ""),
            };
        }
    }

    return null;
}
