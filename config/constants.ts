export const API_ENDPOINTS = {
    GENERATE_TRIP_PDF:
        import.meta.env.VITE_PDF_EXPORT_URL ||
        'https://us-central1-gen-lang-client-0040858908.cloudfunctions.net/generateTripPdf',
    GENERATE_DESTINATION_PDF:
        import.meta.env.VITE_DESTINATION_PDF_URL ||
        'https://us-central1-gen-lang-client-0040858908.cloudfunctions.net/generateDestinationPdf',
    GENERATE_EXPEDITION_PDF:
        import.meta.env.VITE_EXPEDITION_PDF_URL ||
        'https://us-central1-gen-lang-client-0040858908.cloudfunctions.net/generateExpeditionPdf',
    GENERATE_LIVEKIT_TOKEN: import.meta.env.VITE_LIVEKIT_TOKEN_URL || 'https://us-central1-gen-lang-client-0040858908.cloudfunctions.net/generateLiveKitToken',
    RECORD_LIVE_CALL_SECONDS:
        import.meta.env.VITE_RECORD_LIVE_CALL_URL ||
        'https://us-central1-gen-lang-client-0040858908.cloudfunctions.net/recordLiveCallSeconds',
    CREATE_EXPEDITION:
        import.meta.env.VITE_CREATE_EXPEDITION_URL ||
        'https://us-central1-gen-lang-client-0040858908.cloudfunctions.net/createExpedition',
    GET_EXCHANGE_RATES:
        import.meta.env.VITE_EXCHANGE_RATES_URL ||
        'https://us-central1-gen-lang-client-0040858908.cloudfunctions.net/getExchangeRates',
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
