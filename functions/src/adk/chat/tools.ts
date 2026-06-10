import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { getRouteAnalysis } from '../../api/routes';
import { findDestinationCoords, mapDestinationForAgent } from '../../lib/geo';

export interface RouteToolContext {
    destinations: Array<ReturnType<typeof mapDestinationForAgent>>;
    userCoordinates?: { lat: number; lng: number } | null;
    fallbackMessage: string;
}

/** ADK tool — same contract as legacy chatAgent checkRouteStatus. */
export function createCheckRouteStatusTool(ctx: RouteToolContext): FunctionTool {
    return new FunctionTool({
        name: 'checkRouteStatus',
        description:
            'Use when the user asks about routes, traffic, travel time, or tolls to a catalog destination. Never invent distances or times.',
        parameters: z.object({
            destinationName: z
                .string()
                .describe('Destination name as it appears in the knowledge base.'),
            destinationId: z.string().optional().describe('Hidden App destination document id.'),
            destinationLat: z.number().optional(),
            destinationLng: z.number().optional(),
        }),
        execute: async ({ destinationName, destinationId, destinationLat, destinationLng }) => {
            const coords = ctx.userCoordinates;
            if (!coords?.lat || !coords?.lng) {
                return {
                    error:
                        "GPS DENEGADO o NULO. Dile amablemente al usuario: 'Necesito saber desde dónde arrancas tu viaje para calcular la ruta exacta. ¿Cuál es tu punto de partida?'",
                };
            }

            const destCoords = findDestinationCoords(ctx.destinations, {
                destinationId,
                destinationName: destinationName || ctx.fallbackMessage,
                destinationLat,
                destinationLng,
            });

            if (!destCoords) {
                return {
                    error:
                        'No encontré coordenadas del destino en el catálogo. Pide al usuario que aclare el lugar exacto al que desea ir.',
                };
            }

            const analysis = await getRouteAnalysis(
                coords.lat,
                coords.lng,
                destCoords.lat,
                destCoords.lng
            );

            if (!analysis) {
                return { error: 'No se pudo trazar la ruta con Google Maps en este momento.' };
            }

            return {
                ...analysis,
                matchedDestination: destCoords.matchedName || destCoords.matchedId,
            };
        },
    });
}
