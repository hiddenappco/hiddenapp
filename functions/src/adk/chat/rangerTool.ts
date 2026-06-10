import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import {
    getWeatherData,
    getOpenMeteoAirQuality,
    getGoogleAirQuality,
    getMarineData,
} from '../../api/weather';
import { findDestinationCoords, mapDestinationForAgent } from '../../lib/geo';
import { runRangerAdk } from '../ranger/run';
import { buildLanguageDirective, type AppLanguage } from './briefing';

export interface LiveConditionsToolContext {
    destinations: Array<ReturnType<typeof mapDestinationForAgent>>;
    appLanguage: AppLanguage;
}

function isCoastalDestination(dest: Record<string, unknown> | undefined): boolean {
    const coastalVal = String(dest?.isCoastal || '').trim().toLowerCase();
    return coastalVal === 'sí' || coastalVal === 'si';
}

/**
 * Agent-as-tool: exposes the Environmental Ranger to the hyperlocal chat.
 * Fetches live telemetry (weather, AQI, marine when coastal) for a catalog
 * destination and runs the Ranger agent to produce a tactical analysis.
 */
export function createLiveConditionsTool(ctx: LiveConditionsToolContext): FunctionTool {
    return new FunctionTool({
        name: 'getLiveConditions',
        description:
            'Use when the user asks about CURRENT weather, live conditions, tides, sea state, air quality or environmental safety at a catalog destination. Returns real telemetry plus a tactical Ranger analysis. Never invent weather data.',
        parameters: z.object({
            destinationName: z
                .string()
                .describe('Destination name as it appears in the catalog.'),
            destinationId: z.string().optional().describe('Hidden App destination document id.'),
            userQuestion: z
                .string()
                .optional()
                .describe("The user's specific environmental question, verbatim."),
        }),
        execute: async ({ destinationName, destinationId, userQuestion }) => {
            const destCoords = findDestinationCoords(ctx.destinations, {
                destinationId,
                destinationName,
            });

            if (!destCoords) {
                return {
                    error: 'No encontré coordenadas de ese destino en el catálogo. Pide al usuario que aclare el lugar exacto.',
                };
            }

            const matched = ctx.destinations.find(
                (d) =>
                    (destCoords.matchedId && String(d.id) === destCoords.matchedId) ||
                    (destCoords.matchedName &&
                        String((d as Record<string, unknown>).title || '') === destCoords.matchedName)
            ) as Record<string, unknown> | undefined;

            const [weather, openMeteoAqi] = await Promise.all([
                getWeatherData(destCoords.lat, destCoords.lng),
                getOpenMeteoAirQuality(destCoords.lat, destCoords.lng),
            ]);

            let aqiValue = openMeteoAqi;
            if (!aqiValue) {
                aqiValue = await getGoogleAirQuality(destCoords.lat, destCoords.lng);
            }
            if (!aqiValue) {
                aqiValue = weather?.aqi ?? 0;
            }

            const telemetry: Record<string, unknown> = {
                temp: weather?.temperature?.value ?? null,
                feelsLike: weather?.feelsLike?.value ?? null,
                condition: weather?.conditionText ?? 'Estable',
                rainProb: weather?.precipitation?.probability ?? 0,
                uvIndex: weather?.uvIndex ?? 0,
                aqi: aqiValue,
                humidity: weather?.humidity ?? null,
                windSpeed: weather?.wind?.speed?.value ?? null,
            };

            if (isCoastalDestination(matched)) {
                const marine = await getMarineData(destCoords.lat, destCoords.lng);
                if (marine) telemetry.marine = marine;
            }

            const localTime = new Date().toLocaleString('es-CO', {
                timeZone: 'America/Bogota',
                hour12: true,
            });

            const briefing = `${buildLanguageDirective(ctx.appLanguage)}

DESTINO MONITOREADO: ${destCoords.matchedName || destinationName}
FECHA/HORA LOCAL (COLOMBIA): ${localTime}
TELEMETRÍA EN VIVO: ${JSON.stringify(telemetry)}
CONSULTA DEL EXPLORADOR: ${userQuestion || 'Análisis general de condiciones actuales'}

INSTRUCCIONES: Análisis táctico BREVE (máximo 80 palabras) de las condiciones actuales para actividades al aire libre en este destino. Usa **negritas** para valores críticos. No inventes datos fuera de la telemetría.`;

            try {
                const ranger = await runRangerAdk(briefing, 'chat-live-conditions');
                return {
                    destination: destCoords.matchedName || destinationName,
                    analysis: ranger.message,
                    telemetry,
                };
            } catch (err) {
                console.warn('[getLiveConditions] Ranger sub-agent failed, returning raw telemetry:', err);
                return {
                    destination: destCoords.matchedName || destinationName,
                    telemetry,
                    note: 'Análisis Ranger no disponible; interpreta la telemetría directamente.',
                };
            }
        },
    });
}
