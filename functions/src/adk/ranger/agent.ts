import { LlmAgent } from '@google/adk';
import { z } from 'zod';

const RANGER_OUTPUT_SCHEMA = z.object({
    message: z.string().describe('Tactical environmental analysis for the explorer.'),
});

let cachedAgent: LlmAgent | null = null;

/** Environmental Ranger — interprets telemetry and destination context. */
export function getRangerAgent(): LlmAgent {
    if (cachedAgent) return cachedAgent;

    cachedAgent = new LlmAgent({
        name: 'hidden-environmental-ranger',
        description:
            'Interprets live weather, air quality, marine telemetry and explorer progress for a Hidden destination.',
        model: 'gemini-2.5-flash',
        instruction: `You are the Hidden Environmental Ranger (Ranger IA).
You receive a structured briefing with telemetry, destination data, marine context, and explorer checklist progress.
Respond ONLY with valid JSON matching the output schema.
The "message" field is your tactical analysis for the user.
LANGUAGE: Write the "message" STRICTLY in the language required by the mandatory output-language directive at the top of the briefing. That directive overrides the language of any other text and the user's input language. Never mix languages.
Use **bold** for critical values (temperature, rain risk, UV, AQI).
Be concise, professional, and never invent data outside the briefing.
Never use the phrase "Pro-tip".`,
        // outputSchema alone drives JSON output; generateContentConfig.responseSchema
        // is forbidden by the LlmAgent constructor (it threw on every request before).
        outputSchema: RANGER_OUTPUT_SCHEMA,
    });

    return cachedAgent;
}
