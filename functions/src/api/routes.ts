import fetch from "node-fetch";
import { ENV } from "../config/env";

export async function getRouteAnalysis(originLat: number, originLng: number, destLat: number, destLng: number) {
    try {
        const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        const apiKey = String(process.env.GOOGLE_MAPS_API_KEY || ENV.GOOGLE_MAPS_API_KEY).trim();
        const requestBody = {
            origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
            destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            computeAlternativeRoutes: true,
            languageCode: 'es-CO',
            units: 'METRIC',
            extraComputations: ['TOLLS']
        };

        const headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.travelAdvisory.tollInfo,routes.routeLabels'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            console.error("Google Routes API Error:", await response.text());
            return null;
        }

        const data = await response.json();
        return data;
    } catch (e) {
        console.error("Error in getRouteAnalysis:", e);
        return null;
    }
}
