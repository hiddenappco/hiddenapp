export const API_ENDPOINTS = {
    // We use process.env or import.meta.env, falling back to the default URL if not defined
    GENERATE_PDF: import.meta.env.VITE_PDF_EXPORT_URL || 'https://us-central1-gen-lang-client-0040858908.cloudfunctions.net/generateTripPdf',
    GENERATE_LIVEKIT_TOKEN: import.meta.env.VITE_LIVEKIT_TOKEN_URL || 'https://us-central1-gen-lang-client-0040858908.cloudfunctions.net/generateLiveKitToken',
};

export const LIVEKIT_CONFIG = {
    URL: 'wss://hidden-app-ldi9dhb5.livekit.cloud',
};

export const CHAT_LIMITS = {
    FREE_DAILY_MESSAGES: 10,
    MAX_RECORDING_TIME_SEC: 30
};

/** Live voice agent — rolling 30-day window (MVP: all users) */
export const LIVE_CALL_LIMITS = {
    MONTHLY_SECONDS: 30 * 60,
    PERIOD_DAYS: 30,
};

export const COLLECTIONS = {
    USERS: 'users',
    TRIPS: 'trips',
    DESTINATIONS: 'destinations',
    DEPARTMENTS: 'departments',
    EVENTS: 'Events',
    COUPONS: 'Coupons',
    NEWS: 'News',
    SUPPORT_TICKETS: 'support_tickets',
    ASSISTANTS: 'assistants'
};
