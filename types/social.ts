export interface NotificationPrefs {
    ferias: boolean;
    paraisos: boolean;
    noticias: boolean;
    cupones: boolean;
    ofertas: boolean;
    seguridad: boolean;
    vias: boolean;
    itinerarios: boolean;
    support: boolean;
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
    pactAccepted?: boolean;
    completedActivities?: Record<string, number[]>;
    liveCallUsage?: {
        periodStart?: unknown;
        usedSeconds?: number;
        lastUpdated?: unknown;
    };
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
