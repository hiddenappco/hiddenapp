const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTripCode(): string {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
        suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return `HIDDEN-${suffix}`;
}

export function normalizeTripCodeInput(raw: string): string {
    return raw.trim().toUpperCase().replace(/\s+/g, '');
}
