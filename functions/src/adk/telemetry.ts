import { getGcpExporters, getGcpResource, maybeSetOtelProviders } from '@google/adk';

let telemetryReady = false;

/** One-time OpenTelemetry setup for ADK agents (Cloud Trace / Monitoring). */
export async function ensureAdkTelemetry(): Promise<void> {
    if (telemetryReady) return;
    try {
        const hooks = await getGcpExporters({
            enableTracing: true,
            enableMetrics: true,
            enableLogging: false,
        });
        maybeSetOtelProviders([hooks], getGcpResource());
        telemetryReady = true;
        console.log('[ADK] OpenTelemetry configured (GCP trace + metrics)');
    } catch (err) {
        console.warn('[ADK] Telemetry setup skipped:', err);
    }
}
