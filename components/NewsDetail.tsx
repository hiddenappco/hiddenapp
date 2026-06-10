import React from 'react';
import { pickLocalized } from '../utils/localizedContent';
import { NewsArticle } from '../types/content';
import { useParams } from 'react-router-dom';
import { useNewsArticle } from '../hooks/useFirestore';
import { normalizeImage } from '../utils/imageHelpers';
import { useTranslation } from '../hooks/useTranslation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NewsDetailProps {
  article?: NewsArticle;
  onBack: () => void;
}

export const NewsDetail: React.FC<NewsDetailProps> = ({ article: propArticle, onBack }) => {
  const { t, language } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const finalId = id || propArticle?.id;
  const { data: fetchedArticle, loading } = useNewsArticle(finalId);
  const article = propArticle || fetchedArticle;

  if (loading && !article) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content">{t('news.loading')}</div>;
  if (!article && !loading) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content">{t('news.notFound')}</div>;

  if (!article) return null;

  const articleDoc = article as NewsArticle & Record<string, unknown>;
  const displayTitle = pickLocalized(articleDoc, 'title', language) || article.title;
  const displaySummary = pickLocalized(articleDoc, 'summary', language) || article.summary;
  const displayContent = pickLocalized(articleDoc, 'content', language) || article.content;

  const heroImage = normalizeImage(article.image);
  const authorAvatar = article.authorAvatar ? normalizeImage(article.authorAvatar) : "https://lh3.googleusercontent.com/aida-public/AB6AXuAdlLljB1eOaRnjIqYZS4qkCHY5a567jiuPs8BMOmFttgd7terA8JNHBsj-svM2ewJ5J81NoFCqhxJluob40gwzgeyvIsegFAtzoenWPjaQLL30T6yqOxpmgVKUNd7oTe2OFC6qTDZsupeEoW5DxCYj1XABHpky2omnRZ87w4N5huMSgbc2Ua4vHKn96ozSnDh1e-Avhp_IRIIG0WYS81TixgMxr5Ow7p_PIT1fH_sQOUFuzYPyXK66X-IMlOihwLrqq6_jYM_RdoTH";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: displayTitle,
          text: displaySummary,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert(t('common.linkCopied'));
    }
  };

  return (
    <div className="bg-background-dark font-display text-content h-screen w-full flex flex-col relative overflow-y-auto no-scrollbar">
      <div className="relative w-full h-[45vh] shrink-0">
        <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar">
          {article.images && article.images.length > 0 ? (
            article.images.map((img, index) => (
              <div key={index} className="shrink-0 w-full h-full relative snap-center">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url("${normalizeImage(img)}")` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-news-bg-dark"></div>
              </div>
            ))
          ) : (
            <div className="shrink-0 w-full h-full relative snap-center">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${heroImage}")` }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-news-bg-dark"></div>
            </div>
          )}
        </div>

        <div className="absolute top-0 left-0 w-full p-4 pt-safe flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-20">
          <button
            onClick={onBack}
            className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white border border-overlay/10 hover:bg-black/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <button
            onClick={handleShare}
            className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white border border-overlay/10 hover:bg-black/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">share</span>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 w-full px-5 pb-8 pointer-events-none">
          <span className="pointer-events-auto px-3 py-1 bg-primary rounded-lg text-xs font-bold text-white shadow-sm uppercase tracking-wide mb-3 inline-block">
            {article.category}
          </span>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight drop-shadow-md mb-2">
            {displayTitle}
          </h1>
          <div className="flex items-center gap-3 text-sm text-content-secondary font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gray-300 bg-cover bg-center border border-overlay/20" style={{ backgroundImage: `url("${authorAvatar}")` }}></div>
              <span>{article.author}</span>
            </div>
            <span>•</span>
            <span>{article.date}</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 pb-24">
        <p className="text-lg font-medium text-content-secondary leading-relaxed border-l-4 border-primary pl-4">
          {displaySummary}
        </p>

        <div className="prose prose-invert max-w-none 
          prose-p:text-content-secondary prose-p:leading-relaxed prose-p:mb-6
          prose-headings:text-content prose-headings:font-extrabold prose-headings:tracking-tight
          prose-blockquote:border-l-primary prose-blockquote:bg-overlay/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-content-secondary
          prose-strong:text-sunset-orange prose-strong:font-bold
          prose-li:text-content-secondary prose-li:leading-relaxed
          prose-ol:list-decimal prose-ul:list-disc
        ">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => <h1 className="text-2xl mt-8 mb-4 flex items-center gap-2 border-b border-overlay/10 pb-2" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-xl mt-8 mb-4 text-primary" {...props} />,
              blockquote: ({ node, ...props }) => (
                <blockquote className="my-8 border-l-4 border-primary bg-overlay/5 p-6 rounded-r-2xl italic text-lg text-content-secondary shadow-inner" {...props} />
              ),
              strong: ({ node, ...props }) => <strong className="text-sunset-orange font-bold" {...props} />,
              p: ({ node, ...props }) => <p className="text-content-secondary mb-6 leading-relaxed" {...props} />,
              li: ({ node, ...props }) => <li className="text-content-secondary mb-3 pl-2" {...props} />
            }}
          >
            {displayContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
