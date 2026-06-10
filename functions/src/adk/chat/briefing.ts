export type AppLanguage = 'es' | 'en';

export function normalizeAppLanguage(language?: string): AppLanguage {
    return language === 'en' ? 'en' : 'es';
}

function buildAppLanguageRule(appLanguage: AppLanguage): string {
    if (appLanguage === 'en') {
        return `9. APP OUTPUT LANGUAGE (MANDATORY): Write the "message" field EXCLUSIVELY in English (en-US). The user may write in another language; you still reply ONLY in English.`;
    }
    return `9. IDIOMA DE SALIDA DE LA APP (OBLIGATORIO): Escribe el campo "message" EXCLUSIVAMENTE en español. El usuario puede escribir en otro idioma; tú respondes ÚNICAMENTE en español.`;
}

/**
 * Top-of-prompt language mandate. Placed BEFORE the Firestore personality
 * prompt (which is written in Spanish) so it dominates the model's behavior.
 * This is the single source of truth for the agent's output language and
 * overrides both the user's input language and the language of any other
 * instruction text below it.
 */
export function buildLanguageDirective(appLanguage: AppLanguage): string {
    if (appLanguage === 'en') {
        return `================ MANDATORY OUTPUT LANGUAGE: ENGLISH (en-US) ================
Your entire reply MUST be written in English, every single word.
- This rule overrides everything else. Some instructions below are written in Spanish — that text is ONLY context for you; it does NOT mean you reply in Spanish.
- Ignore the language the explorer writes or speaks in. Even if they write in Spanish, you answer in English.
- Never mix languages. Never translate the user's words back. Just respond naturally in English.
===========================================================================`;
    }
    return `================ IDIOMA DE SALIDA OBLIGATORIO: ESPAÑOL ================
Toda tu respuesta DEBE estar escrita en español, cada palabra.
- Esta regla está por encima de todo lo demás. Si el explorador te escribe o habla en otro idioma, tú respondes igualmente en español.
- Nunca mezcles idiomas. Responde de forma natural en español.
======================================================================`;
}

export interface ChatBriefingParams {
    assistantName: string;
    assistantTone: string;
    systemPrompt: string;
    canonicalId: string;
    kbIds: string[];
    currentDateTime: string;
    currentDay: string;
    firstName: string;
    historyContext: string;
    message: string;
    appLanguage: AppLanguage;
    coordinates?: { lat: number; lng: number } | null;
    /** Full KB blob for legacy Gemini SDK fallback only. */
    legacyContext?: Record<string, unknown>;
    mode: 'adk' | 'legacy';
}

function buildAdkCatalogSection(params: Pick<ChatBriefingParams, 'canonicalId' | 'kbIds' | 'coordinates'>): string {
    const gpsLine =
        params.coordinates?.lat && params.coordinates?.lng
            ? `${params.coordinates.lat}, ${params.coordinates.lng}`
            : 'no disponible — pide punto de partida para rutas';

    return `### ACCESO AL CATÁLOGO (AGENTIC RAG) ###
Departamento activo: ${params.canonicalId}
KB ids: ${params.kbIds.join(', ')}
GPS del explorador: ${gpsLine}

Usa las herramientas disponibles para leer Firestore bajo demanda:
- MCP (hidden_get_*): departamento, destinos, refugios, cupones, eventos, noticias
- getDepartment / getDestinations / getRefugios / getCoupons / getEvents / getNews (FunctionTool)
- checkRouteStatus para rutas, tráfico, peajes o "cómo llegar"
- getLiveConditions para clima ACTUAL, condiciones en vivo, mareas o seguridad ambiental de un destino

NUNCA inventes ids, precios, rutas ni fichas. Consulta tools antes de responder con datos del catálogo.`;
}

function buildChatCoreSections(params: Omit<ChatBriefingParams, 'historyContext' | 'message' | 'mode' | 'legacyContext'>): string {
    return `### PERFIL DEL ASISTENTE ###
NOMBRE: ${params.assistantName}
TONO: ${params.assistantTone}
DEPARTAMENTO: ${params.canonicalId}

### CONTEXTO TEMPORAL (HORA LOCAL COLOMBIA) ###
FECHA: ${params.currentDateTime}
DÍA: ${params.currentDay}

### INSTRUCCIONES DE PERSONALIDAD Y COMPORTAMIENTO (FUENTE ÚNICA) ###
${params.systemPrompt}

### REGLAS TÉCNICAS INVIOLABLES ###
1. ESTRUCTURA DE RESPUESTA: Responde SIEMPRE en formato JSON válido.
2. CONCISIÓN: Máximo 120 palabras. Sé directo y útil. Usa **negritas** para resaltar lugares o precios importantes.
3. FORMATO: Escribe de forma natural. NO uses la frase "Pro-tip" ni "Pro-tip Hidden".
4. HERRAMIENTAS: Si preguntan por CÓMO LLEGAR, TRÁFICO, RUTAS, DEBES usar 'checkRouteStatus'. Si preguntan por CLIMA ACTUAL o CONDICIONES EN VIVO, DEBES usar 'getLiveConditions'.
5. ESTILO: Dirígete directamente al usuario por su nombre: ${params.firstName}. No uses palabras como "Aventurero" o "Viajero".
6. PRECIOS: Usa la propiedad 'pricingGuide' de destinos. NUNCA inventes precios.
7. FICHA DEL DEPARTAMENTO: Para cultura, historia, logística, temporada, seguridad, gastronomía, ecosistemas y tips generales, usa getDepartment / hidden_get_department.
8. REFUGIOS Y HOSPEDAJES: Usa getRefugios / hidden_get_refugios filtrando por destinationId cuando el usuario nombra un destino concreto.
${buildAppLanguageRule(params.appLanguage)}
10. TARJETAS (WIDGETS) — OBLIGATORIO cuando cites fichas del catálogo:
   - Destino → {"type":"destination","id": "<id>"}
   - Cupón → {"type":"coupon","id": "<id>"}
   - Refugio → {"type":"refugio","id": "<id>"}
   - Evento/feria → {"type":"event","id": "<id>"}
   - Noticia → {"type":"news","id": "<id>"}
   - Expedición (tras usar planExpedition) → {"type":"expedition","id": "<expeditionId devuelto por la tool>"}
   Usa ids devueltos por las tools. Hasta 5 widgets por respuesta.
11. PLANIFICADOR DE EXPEDICIONES: cuando el usuario pida planear un viaje/itinerario de uno o más días, usa la tool planExpedition (pregunta primero cuántos días si no lo dijo). La tool corre en segundo plano: avisa que los agentes especialistas están armando el plan e incluye SIEMPRE el widget de expedición con el id devuelto.`;
}

function buildResponseFormatSection(appLanguage: AppLanguage): string {
    return `### FORMATO DE RESPUESTA FINAL ###
Responde ÚNICAMENTE con JSON válido:
{
  "message": "respuesta en texto markdown",
  "widgets": [{"type": "destination|coupon|refugio|event|news|expedition", "id": "firebase-doc-id"}],
  "telemetry": {}
}
Sin bloques \`\`\`json.
${appLanguage === 'en'
    ? 'REMINDER: the "message" value must be written in English.'
    : 'RECORDATORIO: el valor de "message" debe estar escrito en español.'}`;
}

export type ChatInstructionParams = Omit<ChatBriefingParams, 'historyContext' | 'message' | 'mode' | 'legacyContext'>;

/**
 * Builds the ADK agent instruction (system-level). Excludes conversation
 * history and the user message: those live in the persistent ADK session,
 * so each turn only sends the new user message.
 */
export function buildChatAgentInstruction(params: ChatInstructionParams): string {
    return `
${buildLanguageDirective(params.appLanguage)}

${buildChatCoreSections(params)}

${buildAdkCatalogSection(params)}

${buildResponseFormatSection(params.appLanguage)}
`.trim();
}

export function buildChatSessionBriefing(params: ChatBriefingParams): string {
    const catalogSection =
        params.mode === 'adk'
            ? buildAdkCatalogSection(params)
            : `### BASE DE CONOCIMIENTO (DATOS REALES) ###
${JSON.stringify(params.legacyContext ?? {})}`;

    return `
${buildLanguageDirective(params.appLanguage)}

${buildChatCoreSections(params)}

${catalogSection}

### HISTORIAL DE CONVERSACIÓN ###
${params.historyContext}

### MENSAJE DEL USUARIO ###
${params.message}

${buildResponseFormatSection(params.appLanguage)}
`.trim();
}
