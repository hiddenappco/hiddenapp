export interface NotificationPrefs {
    ferias: boolean;
    paraisos: boolean;
    noticias: boolean;
    refugios: boolean;
    cupones: boolean;
    ofertas: boolean;
    seguridad: boolean;
    vias: boolean;
    itinerarios: boolean;
    support: boolean;
}

export interface AppPrefs {
    theme?: 'light' | 'dark' | 'system';
    language?: 'es' | 'en';
    coachmarksVersion?: number;
    updatedAt?: string;
}

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    type: 'support' | 'promo' | 'system' | 'news';
    link?: string;
    read: boolean;
    createdAt: any; 
}

export type UserType =
    | 'Explorador'
    | 'Guardián Local'
    | 'CEO'
    | 'Team'
    | 'Aliado Comercial';

export interface UserProfile {
    uid: string;
    displayName?: string;
    name?: string;
    email: string;
    userType?: UserType | string;
    isPremium?: boolean;
    isGuest?: boolean;
    photoURL?: string;
    country?: string;
    department?: string;
    city?: string;
    bio?: string;
    updatedAt?: any; 
    fcmToken?: string;
    notificationPrefs?: NotificationPrefs;
    appPrefs?: AppPrefs;
    pactAccepted?: boolean;
    completedActivities?: Record<string, number[]>;
    liveCallUsage?: {
        periodStart?: unknown;
        usedSeconds?: number;
        lastUpdated?: unknown;
    };
    liveTrialUsedSeconds?: number;
    rangerUsage?: { date?: string; count?: number };
    expeditionPlansUsed?: {
        periodStart?: unknown;
        count?: number;
    };
    premiumExpiresAt?: unknown;
    /** Rowy: trip_pass | monthly | annual | lifetime — drives auto Duration on premium activation */
    premiumPlan?: 'trip_pass' | 'monthly' | 'annual' | 'lifetime' | string;
    /** Server-maintained sum of verified direct-to-host COP (P2-ESG-01). */
    directInjectionTotalCop?: number;
}

export interface TicketMessage {
    sender: 'user' | 'support';
    text: string;
    timestamp: any; 
}

export interface SupportTicket {
    id: string;
    userId: string;
    userName: string;
    topic: string;
    subject: string;
    status: 'open' | 'replied' | 'customer-replied' | 'closed';
    createdAt: any; 
    updatedAt: any; 
    messages: TicketMessage[];
    adminReplyInput?: string; 
    hasUnreadMessages?: boolean;
}
