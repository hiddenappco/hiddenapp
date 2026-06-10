export type ChatWidgetType = 'destination' | 'coupon' | 'refugio' | 'event' | 'news' | 'expedition';

export interface NormalizedChatWidget {
  type: ChatWidgetType;
  id: string;
}

const TYPE_ALIASES: Record<string, ChatWidgetType> = {
  destination: 'destination',
  destino: 'destination',
  destinos: 'destination',
  coupon: 'coupon',
  coupons: 'coupon',
  cupon: 'coupon',
  cupones: 'coupon',
  refugio: 'refugio',
  refugios: 'refugio',
  lodging: 'refugio',
  hospedaje: 'refugio',
  event: 'event',
  events: 'event',
  feria: 'event',
  ferias: 'event',
  fair: 'event',
  news: 'news',
  noticia: 'news',
  noticias: 'news',
  expedition: 'expedition',
  expedicion: 'expedition',
  itinerario: 'expedition',
  itinerary: 'expedition',
};

export function normalizeWidgetType(raw: unknown): ChatWidgetType | null {
  const key = String(raw ?? '').toLowerCase().trim();
  return TYPE_ALIASES[key] ?? null;
}

export function normalizeChatWidget(raw: unknown): NormalizedChatWidget | null {
  if (!raw || typeof raw !== 'object') return null;
  const type = normalizeWidgetType((raw as { type?: unknown }).type);
  const id = String((raw as { id?: unknown }).id ?? '').trim();
  if (!type || !id) return null;
  return { type, id };
}

export function getChatWidgetPath(type: ChatWidgetType, id: string): string {
  switch (type) {
    case 'destination':
      return `/destination/${id}`;
    case 'coupon':
      return `/coupons/${id}`;
    case 'refugio':
      return `/refugio/${id}`;
    case 'event':
      return `/calendar/${id}`;
    case 'news':
      return `/news/${id}`;
    case 'expedition':
      // Expedition widgets render inline in the chat; no detail route.
      return '/home';
    default:
      return '/home';
  }
}
