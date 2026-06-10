import React from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from './layout/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../hooks/useFirestore';

interface NotificationsProps {
  language: Language;
  onBack: () => void;
  onSettings: () => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ onBack, onSettings }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visibleLimit, setVisibleLimit] = React.useState(20);
  const { data: notifications, loading } = useNotifications(user?.uid, visibleLimit);

  const handleNotificationClick = (notif: any) => {
    if (!user) return;
    if (!notif.read) {
      markNotificationAsRead(user.uid, notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const unreadIds = notifications.filter((n: any) => !n.read).map((n: any) => n.id);
    if (unreadIds.length === 0) return;

    try {
      await markAllNotificationsAsRead(user.uid, unreadIds);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleLoadMore = () => {
    setVisibleLimit(prev => Math.min(prev + 20, 100));
  };

  const hasUnread = notifications.some((n: any) => !n.read);
  const showLoadMore = notifications.length === visibleLimit && visibleLimit < 100;

  return (
    <div className="bg-background-dark font-display text-content antialiased h-screen w-full flex flex-col overflow-hidden relative">

      {/* Background Gradient Effect */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background-dark/95 backdrop-blur-md px-5 pb-5 pt-safe border-b border-overlay/5 shadow-sm transition-colors">
        <button
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors text-content"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-bold leading-tight tracking-tight text-content shadow-sm">{t('notifications.title')}</h2>
        </div>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex size-10 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors text-orange-400 group relative"
              title={t('notifications.markAllRead')}
            >
              <span className="material-symbols-outlined text-[24px]">done_all</span>
              {/* Tooltip simple for desktop if needed */}
              <span className="absolute -bottom-10 right-0 bg-black/80 text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {t('notifications.markAllRead')}
              </span>
            </button>
          )}
          <button
            onClick={onSettings}
            className="flex size-10 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors text-content"
          >
            <span className="material-symbols-outlined text-[24px]">tune</span>
          </button>
        </div>
      </header>

      {/* Content List */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 px-4 no-scrollbar z-10 relative">
        {loading && visibleLimit === 20 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-60">
            <div className="size-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-medium tracking-wide">{t('common.loading')}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center text-content/40">
            <div className="bg-overlay/5 p-6 rounded-full mb-4 ring-1 ring-white/10">
              <span className="material-symbols-outlined text-5xl text-content/20">notifications_off</span>
            </div>
            <p className="font-medium text-lg">{t('notifications.empty')}</p>
            <p className="text-sm mt-2 max-w-[200px] leading-relaxed opacity-60">
              {t('notifications.emptyHint')}
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {notifications.map((notif: any) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative flex gap-4 p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-md overflow-hidden ${!notif.read
                  ? 'bg-overlay/10 border-orange-500/30 ring-1 ring-orange-500/20 shadow-lg shadow-orange-900/10'
                  : 'bg-overlay/5 border-overlay/5 hover:bg-overlay/10'
                  }`}
              >
                {/* Unread Indicator */}
                {!notif.read && (
                  <div className="absolute top-4 right-4 size-2.5 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-pulse"></div>
                )}

                <div className="flex items-start gap-4 w-full">
                  <div className={`flex items-center justify-center rounded-xl shrink-0 size-12 shadow-inner ${notif.type === 'support' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' :
                    notif.type === 'promo' ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30' :
                      notif.type === 'system' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' :
                        'bg-overlay/10 text-content/60 ring-1 ring-white/20'
                    }`}>
                    <span className="material-symbols-outlined text-[24px]">
                      {notif.icon || (
                        notif.type === 'support' ? 'support_agent' :
                          notif.type === 'promo' ? 'confirmation_number' :
                            notif.type === 'system' ? 'health_and_safety' : 'notifications'
                      )}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-center gap-1.5 min-w-0">
                    <p className={`text-content text-[15px] leading-snug truncate pr-4 ${!notif.read ? 'font-bold' : 'font-medium opacity-90'}`}>
                      {notif.title}
                    </p>
                    <p className="text-content/60 text-[13px] font-medium leading-relaxed line-clamp-2">
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="material-symbols-outlined text-[12px] text-content/30">schedule</span>
                      <p className="text-content/40 text-[11px] font-medium tracking-wide">
                        {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recientemente'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {showLoadMore && (
              <div className="pt-4 pb-8 flex flex-col items-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-overlay/5 border border-overlay/10 text-sm font-bold text-content/80 hover:bg-overlay/10 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="size-4 border-2 border-overlay/50 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">keyboard_double_arrow_down</span>
                  )}
                  {t('notifications.loadMore')}
                </button>
              </div>
            )}

            {/* Max Limit Message */}
            {visibleLimit >= 100 && notifications.length >= 100 && (
              <div className="pt-4 pb-8 text-center">
                <p className="text-xs font-medium text-content/30 italic">
                  {t('notifications.maxReached')}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
