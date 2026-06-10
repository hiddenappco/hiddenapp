import React from 'react';
import { Language } from '../types/core';
import { NewsArticle } from '../types/content';
import { useNews } from '../hooks/useFirestore';
import { normalizeImage } from '../utils/imageHelpers';
import { useTranslation } from '../hooks/useTranslation';

interface NewsFeedProps {
  language: Language;
  onMenuClick: () => void;
  onProfileClick: () => void;
  onNewsItemClick: (news: NewsArticle) => void;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({
  language,
  onMenuClick,
  onProfileClick,
  onNewsItemClick
}) => {
  const { t } = useTranslation();
  const { data: newsItems, loading } = useNews();
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);

  const filterLabels: Record<string, string> = {
    tourism: t('news.tourism'),
    all: t('news.all'),
    newDest: t('news.destinations'),
    alerts: t('news.alerts'),
    tips: t('news.tips'),
    trending: t('news.trending'),
    culture: t('news.culture'),
    essential: t('news.essential')
  };

  const filterMap: Record<string, string> = {
    tourism: t('news.tourism'),
    all: 'all',
    newDest: t('news.destinations'),
    alerts: t('news.alerts'),
    tips: t('news.tips'),
    trending: t('news.trending'),
    culture: t('news.culture'),
    essential: t('news.essential')
  };

  const filteredNews = newsItems.filter(item => {
    // Category Filter
    if (activeFilter !== 'all') {
      const targetCategory = filterMap[activeFilter];
      if (item.category !== targetCategory) return false;
    }

    // Search Filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesTitle = item.title?.toLowerCase().includes(search);
      const matchesSummary = item.summary?.toLowerCase().includes(search);
      const matchesCategory = item.category?.toLowerCase().includes(search);
      // Assuming news might have a department or location field based on user request
      const matchesExtra = (item as any).department?.toLowerCase().includes(search) || (item as any).location?.toLowerCase().includes(search);

      if (!matchesTitle && !matchesSummary && !matchesCategory && !matchesExtra) return false;
    }

    return true;
  });

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden max-w-md mx-auto bg-background-dark font-display">

      {/* Header */}
      <header className="flex-none z-20 bg-background-dark/95 backdrop-blur-md border-b border-overlay/5 px-4 pt-safe pb-2">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onMenuClick}
            className="flex items-center justify-center w-10 h-10 rounded-full text-content bg-overlay/5 hover:bg-overlay/10 shadow-sm border border-overlay/10 transition-colors -ml-2"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          {!isSearching ? (
            <>
              <h2 className="text-xl font-bold leading-tight tracking-tight text-content flex-1 text-center">{t('news.title')}</h2>
              <button
                onClick={() => setIsSearching(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-overlay/5 text-content hover:bg-primary/10 transition-colors -mr-2"
              >
                <span className="material-symbols-outlined text-[24px]">search</span>
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center bg-surface-dark rounded-xl px-3 ml-2 -mr-2">
              <span className="material-symbols-outlined text-content-muted text-[20px] mr-2">search</span>
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('news.searchPlaceholder')}
                className="flex-1 bg-transparent py-2 text-sm text-content outline-none"
              />
              <button onClick={() => { setIsSearching(false); setSearchTerm(''); }}>
                <span className="material-symbols-outlined text-content-muted text-[20px]">close</span>
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {Object.entries(filterLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`flex h-8 shrink-0 items-center justify-center px-4 rounded-full font-medium text-sm transition-all whitespace-nowrap ${activeFilter === key
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-surface-dark border border-overlay/5 text-content-secondary hover:border-primary/50'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5 pb-8 no-scrollbar">

        {loading ? (
          <div className="text-center py-10 text-content-subtle">{t('news.loadingFeed')}</div>
        ) : filteredNews.length > 0 ? (
          <>
            {/* News List */}
            {filteredNews.map((item) => {
              const bgImage = normalizeImage(item.image);
              return (
                <article
                  key={item.id}
                  onClick={() => onNewsItemClick(item)}
                  className="flex flex-col rounded-2xl overflow-hidden bg-surface-dark border border-overlay/5 shadow-sm active:scale-[0.98] transition-transform duration-200 cursor-pointer"
                >
                  {/* Image Header */}
                  <div className="relative w-full aspect-video bg-gray-200 dark:bg-gray-800">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url("${bgImage}")` }}
                    ></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-lg text-[10px] font-bold text-white border border-overlay/10 uppercase tracking-wide">
                        {item.category}
                      </span>
                      {item.badge && (
                        <span className="px-2.5 py-1 bg-primary rounded-lg text-[10px] font-bold text-white shadow-sm uppercase tracking-wide">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col gap-2">
                    <h3 className="text-lg font-bold leading-tight text-content line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-content-muted text-sm leading-relaxed line-clamp-2">
                      {item.summary}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-overlay/5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gray-700 bg-cover bg-center" style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuAdlLljB1eOaRnjIqYZS4qkCHY5a567jiuPs8BMOmFttgd7terA8JNHBsj-svM2ewJ5J81NoFCqhxJluob40gwzgeyvIsegFAtzoenWPjaQLL30T6yqOxpmgVKUNd7oTe2OFC6qTDZsupeEoW5DxCYj1XABHpky2omnRZ87w4N5huMSgbc2Ua4vHKn96ozSnDh1e-Avhp_IRIIG0WYS81TixgMxr5Ow7p_PIT1fH_sQOUFuzYPyXK66X-IMlOihwLrqq6_jYM_RdoTH")` }}></div>
                        <span className="text-xs text-content-subtle font-medium">{item.date} {item.readTime ? `• ${item.readTime}` : ''}</span>
                      </div>
                      <button className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                        {t('common.readMore')}
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Footer Hint */}
            <div className="flex flex-col items-center justify-center py-6 opacity-50">
              <span className="material-symbols-outlined text-3xl text-content-muted mb-2">newspaper</span>
              <p className="text-xs text-content-subtle">{t('news.upToDate')}</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-60">
            <span className="material-symbols-outlined text-5xl mb-4 text-gray-600">search_off</span>
            <p className="text-lg font-medium text-content-subtle">{t('news.noResults')}</p>
          </div>
        )}

      </main>
    </div>
  );
};