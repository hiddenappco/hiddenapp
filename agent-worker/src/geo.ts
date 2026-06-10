export function normalizeCoordinates(raw: unknown): { lat: number; lng: number } | null {
    if (!raw || typeof raw !== 'object') return null;
    const c = raw as Record<string, unknown>;
    const lat = c.lat ?? c.latitude;
    const lng = c.lng ?? c.longitude;
    if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
    }
    return null;
}

const normalizeText = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function findDestinationInDocs(
    docs: Array<{ id: string; data: () => Record<string, unknown> }>,
    destination: string,
    destinationId?: string
): { lat: number; lng: number; docId: string; name: string } | null {
    if (destinationId) {
        const idNorm = normalizeText(destinationId);
        const byId = docs.find((d) => {
            const data = d.data();
            const customId = normalizeText(String(data.id || data.customId || d.id || ''));
            return normalizeText(d.id) === idNorm || customId === idNorm;
        });
        if (byId) {
            const coords = normalizeCoordinates(byId.data().coordinates);
            if (coords) {
                const data = byId.data();
                return { ...coords, docId: byId.id, name: String(data.name || data.title || destination) };
            }
        }
    }

    const q = normalizeText(destination);
    const found = docs.find((d) => {
        const data = d.data();
        const name = normalizeText(String(data.name || data.title || ''));
        return name.includes(q) || q.includes(name);
    });

    if (!found) return null;
    const coords = normalizeCoordinates(found.data().coordinates);
    if (!coords) return null;
    const data = found.data();
    return { ...coords, docId: found.id, name: String(data.name || data.title || destination) };
}
