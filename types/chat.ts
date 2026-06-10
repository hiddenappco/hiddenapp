export interface ChatWidget {
    type: 'destination' | 'coupon' | 'refugio' | 'event' | 'news';
    id: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    widgets?: ChatWidget[];
    /** @deprecated Solo en historial previo al modo solo texto */
    audioUrl?: string;
    createdAt: any;
}
