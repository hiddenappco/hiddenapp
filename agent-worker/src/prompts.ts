/**
 * Hidden Agent Worker — System Prompt Builder
 * 
 * Fetches the assistant configuration from Firestore and constructs the system prompt
 * for the Live voice session.
 * 
 * Tool Calling (RAG) replaces static context injection, guaranteeing that Gemini
 * ALWAYS fetches real, up-to-date data from Firestore to prevent hallucinations.
 */

import { db } from './firebase.js';
import { getAssistantDocId } from './departmentProfile.js';

export type AppLanguage = 'es' | 'en';

function normalizeAppLanguage(language?: string): AppLanguage {
    return language === 'en' ? 'en' : 'es';
}

function buildLanguageBlock(appLanguage: AppLanguage): string {
    if (appLanguage === 'en') {
        return `### APP OUTPUT LANGUAGE (MANDATORY) ###
Respond ALWAYS in English (en-US), including the first greeting and every turn.
The explorer may speak another language; you still reply ONLY in English.
Use neutral, clear American English.`;
    }
    return `### IDIOMA DE SALIDA DE LA APP (OBLIGATORIO) ###
Responde SIEMPRE en español, incluido el saludo inicial y cada turno.
El explorador puede hablarte en otro idioma; tú respondes ÚNICAMENTE en español.
Evita exagerar acentos regionales; tono neutro, profesional y cálido.`;
}

/**
 * Top-of-prompt language mandate for the Live voice agent. Placed BEFORE the
 * Firestore personality prompt (written in Spanish) so it dominates behavior.
 * Voice models tend to mirror the spoken language, so this is intentionally
 * emphatic about ignoring the explorer's spoken language.
 */
function buildLanguageDirective(appLanguage: AppLanguage): string {
    if (appLanguage === 'en') {
        return `================ MANDATORY SPOKEN LANGUAGE: ENGLISH (en-US) ================
You MUST speak ONLY in English on every single turn, including the very first greeting.
- This rule overrides everything else. The instructions below are written in Spanish — that is ONLY context; it does NOT mean you speak Spanish.
- CRITICAL: Even if the explorer talks to you in Spanish (or any other language), you STILL answer in English. Do not switch to the explorer's language. Do not mirror it.
- Never mix languages within a sentence.
===========================================================================`;
    }
    return `================ IDIOMA HABLADO OBLIGATORIO: ESPAÑOL ================
DEBES hablar ÚNICAMENTE en español en cada turno, incluido el primer saludo.
- Esta regla está por encima de todo lo demás.
- CRÍTICO: Aunque el explorador te hable en inglés (o en cualquier otro idioma), tú SIEMPRE respondes en español. No cambies al idioma del explorador. No lo imites.
- Nunca mezcles idiomas dentro de una misma frase.
====================================================================`;
}

/** Voice-specific behavioral rules appended to the Firestore system prompt */
function buildVoiceInstructions(appLanguage: AppLanguage): string {
    const languageBlock = buildLanguageBlock(appLanguage);
    return `
### REGLAS DE SEGURIDAD (SEMÁFORO) ###
- Si un destino tiene "operationalStatus" en "red" (cerrado/emergencia) o status "Cerrado", BAJO NINGUNA CIRCUNSTANCIA lo recomiendes para visitar. Si el usuario pregunta por él, indícale claramente que actualmente se encuentra CERRADO por razones de seguridad ambiental o climática.

### REGLAS ADICIONALES PARA MODO LIVE (VOZ) ###
- Estás en una llamada de voz en tiempo real con un explorador.
- Sé CONCISO. En voz, las respuestas largas son tediosas. Máximo 3-4 oraciones por turno.
- Usa pausas naturales. No listes datos como un robot.
- Si no sabes algo, dilo honestamente. No inventes información.
- Cuando uses una herramienta, integra la información de forma natural en tu respuesta hablada.
- NUNCA digas "Pro-tip", "Life hack", ni uses jerga de marketing.

${languageBlock}

### REGLA DE ORO INVIOLABLE CONTRA ALUCINACIONES ###
Bajo ninguna circunstancia debes inventar, asumir o buscar en tu conocimiento general información sobre destinos, lugares, cupones, noticias, festivales, ferias, la ficha del departamento o vías. Si el usuario te pregunta por cualquier dato, lugar, recomendación, distancia o ruta de la región, DEBES ejecutar la herramienta de búsqueda en la base de datos correspondiente (getDepartmentInfo, getDestinations, checkRouteStatus, etc.). Si la herramienta no devuelve resultados, debes responder con total honestidad que no tenemos ese lugar o dato registrado en el catálogo actual de Hidden App. No ofrezcas datos que no provengan EXCLUSIVAMENTE de las herramientas. Tómate una fracción de segundo para buscar lo que haya que buscar, el explorador lo entenderá.
`;
}

/**
 * Fetches the system prompt from Firestore and injects temporal context.
 */
export async function getSystemPrompt(
    departmentId: string,
    appLanguage: AppLanguage = 'es'
): Promise<{
    systemPrompt: string;
    assistantName: string;
    tone: string;
}> {
    const locale = appLanguage === 'en' ? 'en-US' : 'es-ES';
    try {
        // Normalize department ID (same logic as useAssistant hook and chatAgent)
        const docId = getAssistantDocId(departmentId);
        
        const assistantDoc = await db.collection('assistants').doc(docId).get();
        let assistantData = assistantDoc.exists ? assistantDoc.data()! : null;

        if (!assistantData) {
            assistantData = {
                name: "Guía Hidden",
                tone: "Amable, práctico y entusiasta",
                systemPrompt: "Eres un guía de expedición experto en los paraísos escondidos de Colombia. Tu tono es cercano, aventurero y muy práctico. No hables como un sistema de seguridad formal, sino como un amigo experto que cuida al viajero.",
            };
        }
        
        const name = assistantData.name || 'Guía Hidden';
        const tone = assistantData.tone || 'Amable, práctico y entusiasta';
        const basePrompt = assistantData.systemPrompt || '';

        // Build the temporal context
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
            timeZone: 'America/Bogota'
        };
        const currentDateTime = now.toLocaleDateString(locale, options);
        const currentDay = now.toLocaleDateString(locale, { weekday: 'long', timeZone: 'America/Bogota' });

        const fullPrompt = `
${buildLanguageDirective(appLanguage)}

### PERFIL DEL ASISTENTE ###
NOMBRE: ${name}
TONO: ${tone}
DEPARTAMENTO: ${departmentId}

### CONTEXTO TEMPORAL (HORA LOCAL COLOMBIA) ###
FECHA: ${currentDateTime}
DÍA: ${currentDay}

### INSTRUCCIONES DE PERSONALIDAD Y COMPORTAMIENTO (FUENTE: FIREBASE) ###
${basePrompt}

### REGLAS TÉCNICAS ###
1. CONCISIÓN: Sé directo y útil. Máximo 3-4 oraciones en tus respuestas para que la voz no sea monótona o aburrida.
2. ESTILO: Dirígete directamente al usuario. No uses palabras como "Aventurero" o "Viajero".
3. PRECIOS: Usa datos reales obtenidos de tus herramientas. NUNCA inventes precios.
4. HERRAMIENTAS DE RAG: ESTÁS OBLIGADO A USAR TUS HERRAMIENTAS. Tienes herramientas disponibles para consultar la base de datos hiperlocal en tiempo real.
5. FICHA DEL DEPARTAMENTO: Si preguntan por el departamento en general (historia, cultura, logística, temporada, seguridad, gastronomía regional, ecosistemas o tips globales), DEBES invocar 'getDepartmentInfo' antes de responder.
6. RUTAS Y CÓMO LLEGAR: Si el usuario te pregunta por cómo llegar, rutas terrestres, peajes, distancias o tiempos de viaje, DEBES invocar la herramienta 'checkRouteStatus'. NUNCA intentes estimar rutas, distancias o peajes por tu cuenta.
7. REFUGIOS Y HOSPEDAJES: Si el usuario te pregunta por dónde dormir, hoteles, hostales, glampings, refugios o alojamiento en general, DEBES invocar la herramienta 'getRefugios'. Si el usuario menciona o especifica un destino o lugar en particular, DEBES obtener su identificador (ej: "san-cipriano-01") tras ver la lista de destinos e invocar la herramienta 'getRefugios' pasando dicho valor en el parámetro 'destinationId' para filtrar la búsqueda. NUNCA asumas o inventes hospedajes.

${buildVoiceInstructions(appLanguage)}
        `.trim();

        return { systemPrompt: fullPrompt, assistantName: name, tone };
    } catch (error) {
        console.error(`[Prompts] Error fetching assistant for ${departmentId}:`, error);
    }

    // Fallback
    console.warn(`[Prompts] No assistant found for "${departmentId}", using fallback`);
    return {
        systemPrompt: `${buildLanguageDirective(normalizeAppLanguage(appLanguage))}\n\nEres un guía de expedición experto en los paraísos escondidos de Colombia. Tu tono es cercano, aventurero y muy práctico. El usuario está preguntando sobre el departamento "${departmentId}". ${buildVoiceInstructions(normalizeAppLanguage(appLanguage))}`,
        assistantName: 'Guía Hidden',
        tone: 'Amable, práctico y entusiasta',
    };
}

/** Short welcome nudge for the first spoken turn — must match app language. */
export function buildWelcomeInstruction(
    departmentId: string,
    assistantName: string,
    appLanguage: AppLanguage
): string {
    const region = departmentId.includes('valle')
        ? (appLanguage === 'en' ? 'Valle del Cauca' : 'Valle del Cauca')
        : departmentId.includes('amazonas')
            ? (appLanguage === 'en' ? 'Amazonas' : 'Amazonas')
            : (appLanguage === 'en' ? 'Hidden' : 'Hidden');

    if (appLanguage === 'en') {
        return `Greet the explorer with a warm welcome to the hidden paradises of ${region}. Introduce yourself as ${assistantName}. Ask one friendly question to start the conversation. Keep the greeting very short (max 15-20 words), warm, professional and natural. Respond ONLY in English.`;
    }

    return `Saluda al explorador dándole una cálida bienvenida a los paraísos escondidos del ${region}. Preséntate como ${assistantName}. Haz una pregunta muy amigable para iniciar la conversación. Mantén el saludo sumamente corto (máximo 15-20 palabras), cálido, profesional y natural. Responde ÚNICAMENTE en español.`;
}
