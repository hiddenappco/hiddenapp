import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDestination, useCoupon, useEvent, useRefugio, useNewsArticle } from '../../hooks/useFirestore';
import { useTranslation } from '../../hooks/useTranslation';
import { getChatWidgetPath, type ChatWidgetType } from '../../utils/chatWidgets';
import { ChatExpeditionWidget } from './ExpeditionWidget';

const CARD_CLASS =
  'flex-none w-[252px] h-[158px] relative rounded-2xl overflow-hidden border border-white/10 shadow-lg snap-center text-left transition-all hover:border-primary/40 hover:shadow-primary/15 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group';

interface WidgetProps {
  id: string;
  type: ChatWidgetType;
}

const WidgetSkeleton: React.FC = () => (
  <div className={`${CARD_CLASS} bg-surface-dark animate-pulse`}>
    <div className="absolute inset-0 bg-overlay/10" />
  </div>
);

const TypeBadge: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/55 text-white text-[8px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md">
    <span className="material-symbols-outlined text-[12px]">{icon}</span>
    {label}
  </span>
);

const OverlayCard: React.FC<{
  onOpen: () => void;
  imageUrl?: string;
  fallbackIcon: string;
  badge: React.ReactNode;
  title: string;
  subtitle?: string;
  chip?: string;
  footerHint: string;
}> = ({ onOpen, imageUrl, fallbackIcon, badge, title, subtitle, chip, footerHint }) => (
  <button type="button" onClick={onOpen} className={CARD_CLASS}>
    {imageUrl ? (
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url("${imageUrl}")` }}
      />
    ) : (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-surface-dark to-background-dark flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-white/25">{fallbackIcon}</span>
      </div>
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/15" />

    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2 z-10">
      {badge}
      {chip && (
        <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/15 text-white text-[8px] font-bold uppercase backdrop-blur-md border border-white/10">
          {chip}
        </span>
      )}
    </div>

    <div className="absolute bottom-0 left-0 right-0 z-10 p-3 pt-8">
      <h3 className="text-white font-bold text-[13px] leading-snug line-clamp-2 drop-shadow-sm">{title}</h3>
      {subtitle && (
        <p className="text-white/75 text-[10px] leading-tight line-clamp-1 mt-1">{subtitle}</p>
      )}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/15">
        <span className="text-[9px] font-bold uppercase tracking-wider text-primary">{footerHint}</span>
        <span className="material-symbols-outlined text-primary text-[18px]">arrow_forward</span>
      </div>
    </div>
  </button>
);

const useWidgetNavigation = (type: ChatWidgetType, id: string) => {
  const navigate = useNavigate();
  return () => navigate(getChatWidgetPath(type, id));
};

export const ChatDestinationWidget: React.FC<WidgetProps> = ({ id, type }) => {
  const { data: destination, loading } = useDestination(id);
  const { t } = useTranslation();
  const onOpen = useWidgetNavigation(type, id);

  if (loading) return <WidgetSkeleton />;
  if (!destination) return null;

  const subtitle = destination.location || undefined;
  const chip = destination.stats?.hiking ? String(destination.stats.hiking) : undefined;

  return (
    <OverlayCard
      onOpen={onOpen}
      imageUrl={destination.heroImage}
      fallbackIcon="landscape"
      badge={<TypeBadge icon="landscape" label={t('chat.widgetDestination')} />}
      title={destination.title}
      subtitle={subtitle}
      chip={chip}
      footerHint={t('chat.widgetOpen')}
    />
  );
};

export const ChatCouponWidget: React.FC<WidgetProps> = ({ id, type }) => {
  const { data: coupon, loading } = useCoupon(id);
  const { t } = useTranslation();
  const onOpen = useWidgetNavigation(type, id);

  if (loading) return <WidgetSkeleton />;
  if (!coupon) return null;

  return (
    <OverlayCard
      onOpen={onOpen}
      imageUrl={coupon.image}
      fallbackIcon="local_offer"
      badge={<TypeBadge icon="local_offer" label={t('chat.widgetCoupon')} />}
      title={coupon.title}
      subtitle={coupon.location || coupon.coupon_code}
      chip={coupon.discount ? String(coupon.discount) : undefined}
      footerHint={t('chat.widgetOpen')}
    />
  );
};

export const ChatEventWidget: React.FC<WidgetProps> = ({ id, type }) => {
  const { data: event, loading } = useEvent(id);
  const { t } = useTranslation();
  const onOpen = useWidgetNavigation(type, id);

  if (loading) return <WidgetSkeleton />;
  if (!event) return null;

  return (
    <OverlayCard
      onOpen={onOpen}
      imageUrl={event.image}
      fallbackIcon="celebration"
      badge={<TypeBadge icon="celebration" label={t('chat.widgetEvent')} />}
      title={event.name}
      subtitle={event.location}
      chip={event.date}
      footerHint={t('chat.widgetOpen')}
    />
  );
};

export const ChatRefugioWidget: React.FC<WidgetProps> = ({ id, type }) => {
  const { data: refugio, loading } = useRefugio(id);
  const { t } = useTranslation();
  const onOpen = useWidgetNavigation(type, id);

  if (loading) return <WidgetSkeleton />;
  if (!refugio) return null;

  return (
    <OverlayCard
      onOpen={onOpen}
      imageUrl={refugio.heroImage}
      fallbackIcon="cottage"
      badge={<TypeBadge icon="cottage" label={t('chat.widgetRefugio')} />}
      title={refugio.name}
      subtitle={refugio.tagline || refugio.location}
      footerHint={t('chat.widgetOpen')}
    />
  );
};

export const ChatNewsWidget: React.FC<WidgetProps> = ({ id, type }) => {
  const { data: article, loading } = useNewsArticle(id);
  const { t } = useTranslation();
  const onOpen = useWidgetNavigation(type, id);

  if (loading) return <WidgetSkeleton />;
  if (!article) return null;

  return (
    <OverlayCard
      onOpen={onOpen}
      imageUrl={article.image}
      fallbackIcon="newspaper"
      badge={<TypeBadge icon="newspaper" label={t('chat.widgetNews')} />}
      title={article.title}
      subtitle={article.date}
      footerHint={t('chat.widgetOpen')}
    />
  );
};

export const ChatWidgetByType: React.FC<{ type: ChatWidgetType; id: string }> = ({ type, id }) => {
  switch (type) {
    case 'destination':
      return <ChatDestinationWidget type={type} id={id} />;
    case 'coupon':
      return <ChatCouponWidget type={type} id={id} />;
    case 'event':
      return <ChatEventWidget type={type} id={id} />;
    case 'refugio':
      return <ChatRefugioWidget type={type} id={id} />;
    case 'news':
      return <ChatNewsWidget type={type} id={id} />;
    case 'expedition':
      return <ChatExpeditionWidget id={id} />;
    default:
      return null;
  }
};
