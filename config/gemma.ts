/** On-device Gemma (MediaPipe LLM Inference) — GPU int4 ~1.3 GB. */
export const GEMMA_CONFIG = {
    relativePath: 'models/gemma2_2b_it_gpu_int4.bin',
    tempPath: 'models/gemma2_2b_it_gpu_int4.bin.tmp',
    legacyPaths: ['models/gemma4.bin'],
    /** Reject placeholder / corrupt installs */
    minBytes: 50_000_000,
    placeholderMarker: 'GEMMA_LOCAL_MODEL_PLACEHOLDER',
    /** Override via `.env` `VITE_GEMMA_MODEL_URL` or Firestore `config/gemmaModel.downloadUrl` */
    downloadUrl: (import.meta.env.VITE_GEMMA_MODEL_URL as string | undefined)?.trim() || '',
    /** Firebase Storage fallback (`.bin` directo o `.tar.gz` de Kaggle) */
    storageDownloadUrl:
        'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0040858908.appspot.com/o/gemma-2b-it-gpu-int4.bin?alt=media&token=8ecef72d-ea7b-42ac-b44d-7550ae8194a8',
    wasmBaseUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@0.10.27/wasm',
    maxTokens: 512,
    storageKey: 'offgrid_gemma_installed',
    /** Download + installed size (same for direct `.bin`) */
    approxDownloadMb: 1292,
    approxSizeMb: 1292,
    firestoreConfigDoc: 'gemmaModel',
} as const;
