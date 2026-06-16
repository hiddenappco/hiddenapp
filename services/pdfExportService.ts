import { API_ENDPOINTS } from '../config/constants';
import { getAuthHeaders } from './authHeaders';

async function postPdfExport(
    url: string,
    body: Record<string, unknown>
): Promise<string> {
    const response = await fetch(url, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const code = err.error || (await response.text());
        throw new Error(String(code));
    }

    const data = await response.json();
    if (!data.success || !data.pdfUrl) {
        throw new Error('INVALID_PDF_RESPONSE');
    }
    return data.pdfUrl as string;
}

export const exportTripToPdf = async (
    tripId: string,
    userId: string,
    language: 'es' | 'en' = 'es'
): Promise<string> => {
    try {
        return await postPdfExport(API_ENDPOINTS.GENERATE_TRIP_PDF, { tripId, userId, language });
    } catch (error) {
        console.error('Failed to export trip PDF:', error);
        throw error;
    }
};

export const exportDestinationToPdf = async (
    destinationId: string,
    language: 'es' | 'en'
): Promise<string> => {
    try {
        return await postPdfExport(API_ENDPOINTS.GENERATE_DESTINATION_PDF, {
            destinationId,
            language,
        });
    } catch (error) {
        console.error('Failed to export destination PDF:', error);
        throw error;
    }
};

export const exportExpeditionToPdf = async (expeditionId: string): Promise<string> => {
    try {
        return await postPdfExport(API_ENDPOINTS.GENERATE_EXPEDITION_PDF, { expeditionId });
    } catch (error) {
        console.error('Failed to export expedition PDF:', error);
        throw error;
    }
};
