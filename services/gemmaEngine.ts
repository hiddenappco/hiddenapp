import type { ProgressListener } from '@mediapipe/tasks-genai';
import { GEMMA_CONFIG } from '../config/gemma';

type LlmInferenceInstance = import('@mediapipe/tasks-genai').LlmInference;

let session: LlmInferenceInstance | null = null;
let loadPromise: Promise<LlmInferenceInstance> | null = null;
let loadedModelPath: string | null = null;

export async function ensureGemmaSession(modelAssetPath: string): Promise<LlmInferenceInstance> {
    if (session && loadedModelPath === modelAssetPath) {
        return session;
    }

    if (session) {
        session.close();
        session = null;
        loadPromise = null;
    }

    if (loadPromise && loadedModelPath === modelAssetPath) {
        return loadPromise;
    }

    loadedModelPath = modelAssetPath;
    loadPromise = (async () => {
        const { FilesetResolver, LlmInference } = await import('@mediapipe/tasks-genai');
        const wasmFileset = await FilesetResolver.forGenAiTasks(GEMMA_CONFIG.wasmBaseUrl);

        const llm = await LlmInference.createFromOptions(wasmFileset, {
            baseOptions: {
                modelAssetPath,
                delegate: 'GPU',
            },
            maxTokens: GEMMA_CONFIG.maxTokens,
            topK: 40,
            temperature: 0.75,
            randomSeed: 101,
        });

        session = llm;
        return llm;
    })();

    try {
        return await loadPromise;
    } catch (err) {
        loadPromise = null;
        loadedModelPath = null;
        throw err;
    }
}

export async function generateGemmaResponse(
    modelAssetPath: string,
    prompt: string,
    onPartial?: ProgressListener
): Promise<string> {
    const llm = await ensureGemmaSession(modelAssetPath);

    if (onPartial) {
        return llm.generateResponse(prompt, onPartial);
    }

    return llm.generateResponse(prompt);
}

export function disposeGemmaSession(): void {
    session?.close();
    session = null;
    loadPromise = null;
    loadedModelPath = null;
}

/** Strip Gemma turn tokens if the runtime echoes the prompt. */
export function sanitizeGemmaOutput(raw: string): string {
    let text = raw.trim();
    const modelTurn = '<start_of_turn>model';
    const idx = text.lastIndexOf(modelTurn);
    if (idx >= 0) {
        text = text.slice(idx + modelTurn.length).replace(/^\s*\n?/, '');
    }
    text = text.replace(/<end_of_turn>/g, '').replace(/<start_of_turn>\w*/g, '').trim();
    return text;
}
