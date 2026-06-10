export interface MarineData {
    waveHeight: number | null;
    wavePeriod: number | null;
    waterTemp: number | null;
    currentSpeed: number | null;
    currentStatus: string;
    nextHighTide: string | null;
    nextLowTide: string | null;
    nextEvent?: {
        type: 'low' | 'high';
        time: string;
    };
    tomorrow?: {
        nextHighTide: string | null;
        nextLowTide: string | null;
    };
}
