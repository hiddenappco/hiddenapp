import { API_ENDPOINTS } from '../config/constants';

export const exportTripToPdf = async (tripId: string, userId: string, tripName: string): Promise<string> => {
    try {
        const response = await fetch(API_ENDPOINTS.GENERATE_PDF, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tripId, userId }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al generar el PDF: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.pdfUrl) {
             throw new Error('El servidor no devolvió una URL válida para el PDF.');
        }

        return data.pdfUrl;
    } catch (error) {
        console.error('Failed to export PDF:', error);
        throw error;
    }
};
