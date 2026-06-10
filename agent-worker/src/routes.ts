/**
 * Google Routes API v2 — cálculo de ruta con tráfico y peajes.
 */
export async function computeDrivingRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
): Promise<Record<string, unknown>> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return { error: 'La API de rutas está temporalmente inactiva por configuración de servidor.' };
    }

    const requestBody = {
        origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
        destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        languageCode: 'es-CO',
        units: 'METRIC',
        extraComputations: ['TOLLS'],
    };

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey.trim(),
            'X-Goog-FieldMask':
                'routes.duration,routes.distanceMeters,routes.travelAdvisory.tollInfo,routes.routeLabels',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('[Routes] Google Routes API Error:', text);
        return {
            error: 'No se pudo trazar la ruta. Google Maps no encontró un camino terrestre válido entre los puntos.',
        };
    }

    const data = (await response.json()) as { routes?: unknown[] };
    return { routes: data.routes ?? { message: 'No routes found' } };
}
