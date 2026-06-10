import * as tts from "@google-cloud/text-to-speech";
import { v4 as uuidv4 } from "uuid";
import { admin } from "../config/firebase";

const ttsClient = new tts.TextToSpeechClient();

export async function generateSpeech(text: string): Promise<string | null> {
    try {
        console.log(`[TTS] Generating speech for text: "${text.substring(0, 50)}..."`);

        const cleanText = text.replace(/\*/g, "").replace(/#/g, "").trim();

        const request: any = {
            input: { text: cleanText },
            voice: { languageCode: 'es-US', name: 'es-US-Journey-D' }, 
            audioConfig: {
                audioEncoding: 'MP3',
                pitch: 2.0, 
                speakingRate: 1.18, 
                volumeGainDb: 3.0
            },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        const fileName = `voice_responses/${uuidv4()}.mp3`;
        const bucket = admin.storage().bucket();
        const file = bucket.file(fileName);

        const token = uuidv4();
        await file.save(response.audioContent as Buffer, {
            contentType: 'audio/mpeg',
            metadata: {
                cacheControl: 'public, max-age=31536000',
                metadata: {
                    firebaseStorageDownloadTokens: token
                }
            }
        });

        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
        console.log(`[TTS] Generated URL: ${url.substring(0, 50)}...`);
        return url;

    } catch (e) {
        console.error("[TTS] Fatal Error:", e);
        return null;
    }
}
