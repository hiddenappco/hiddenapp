export interface NewsArticle {
    id: string;
    title: string;
    summary: string;
    category: string;
    image: string;
    content: string; 
    author: string;
    authorAvatar?: string;
    date: string; 
    badge?: string;
    readTime?: string;
    images?: string[]; 
}

export interface Department {
    id: string; 
    departmentId?: string; 
    name: string;
    subtitle: string;
    heroImage: string;
    tag: string;
    locationLabel: string;
    description: string;
    temp: string;
    humidity: string;
    safetyNote?: string; 
    logistics?: string;
    seasonality?: string;
    ecosystems?: any; 
    mustTryGastronomy?: any; 
    tips?: any; 
    status?: 'active' | 'coming_soon';
}

export interface PricingItem {
    categoria: string;
    item: string;
    precio_min: number;
    precio_max: number;
    nota?: string;
}

export interface GettingThereItem {
    modalidad: string;
    instrucciones: string;
}

export type PackingPriority = 'esencial' | 'recomendado' | 'opcional' | string;

export interface PackingGuideItem {
    nombre: string;
    prioridad: PackingPriority;
    nota?: string;
}

export interface PackingCategory {
    categoria: string;
    items: PackingGuideItem[];
}

export interface ResolvedPackingGuide {
    summary: string;
    categories: PackingCategory[];
}

export interface Destination {
    id: string;
    departmentId: string; 
    title: string;
    title_en?: string;
    location: string;
    location_en?: string;
    coordinates?: { lat: number; lng: number }; 
    status: boolean; 
    description: string;
    description_en?: string;
    heroImage: string;
    galleryImages: string[]; 
    verified: boolean;
    stats: {
        hiking: 'Bajo' | 'Medio' | 'Alto';
        temp: string;
        signal: 'Nula' | 'Baja' | 'Media' | 'Alta';
    };
    aiTip: string;
    aiTip_en?: string;
    pdfFile?: string; 
    activities?: string[]; 
    activities_en?: string[];
    gettingThere?: GettingThereItem[];
    gettingThere_en?: GettingThereItem[] | string;
    pricingGuide?: PricingItem[];
    pricingGuide_en?: PricingItem[] | string;
    packingGuide?: PackingCategory[] | { packingSummary?: string; packingGuide?: PackingCategory[] } | string;
    packingGuide_en?: PackingCategory[] | { packingSummary?: string; packingGuide?: PackingCategory[] } | string;
    packingSummary?: string;
    packingSummary_en?: string;
    isCoastal?: "Sí" | "No";
}

export interface AppEvent { 
    id: string;
    name: string;
    subtitle?: string;
    location: string;
    coordinates?: { lat: number; lng: number };
    image: string; 
    images?: string[]; 
    description: string;
    date: string; 
    beginningDate?: any; 
    departmentId: string;
    destinationId?: string;
    url?: string;
    priceType?: string; 
    tips?: string;
}

export interface Coupon {
    id: string;
    title: string;
    description: string;
    discount: string;
    image: string;
    category: 'lodging' | 'restaurant' | 'adventure' | 'tours' | 'misc';
    location: string;
    coordinates?: { lat: number; lng: number };
    destinationId?: string; 
    isPremium: boolean;
    validity: string;
    coupon_code: string;
    images?: string[]; 
    redemptionInstructions?: string; 
    featuredCoupon?: boolean; 
}

export interface Refugio {
    id: string;
    name: string;
    departmentId: string;
    destinationId: string[];
    status: 'Activo' | 'Inactivo' | 'Mantenimiento';
    location: string;
    tagline: string;
    description: string;
    heroImage: string;
    gallery: string[];
    amenities: string[];
    pricingGuide?: any;
    coupon: boolean;
    coordinates?: { lat: number; lng: number };
    howToBook?: string;
    bookingLink?: string;
    activities?: any;
    whatsapp?: string;
    type: string[];
    restrictions?: any;
    checkInCheckOut?: any;
}

