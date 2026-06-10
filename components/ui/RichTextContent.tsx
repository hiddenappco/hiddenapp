import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isHtmlContent, normalizeRichText, sanitizeRichHtml } from '../../utils/departmentContent';

const PROSE_WRAPPER =
  'prose prose-invert max-w-none ' +
  'prose-p:text-content-secondary prose-p:leading-relaxed prose-p:mb-4 prose-p:last:mb-0 ' +
  'prose-headings:text-content prose-headings:font-bold prose-headings:tracking-tight ' +
  'prose-strong:text-primary prose-strong:font-bold ' +
  'prose-li:text-content-secondary prose-li:leading-relaxed ' +
  'prose-ul:my-3 prose-ol:my-3';

const HTML_WRAPPER =
  'rich-text-html text-content-secondary text-sm leading-relaxed ' +
  '[&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 ' +
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3 [&_li]:mb-1 [&_strong]:text-primary [&_strong]:font-bold';

interface RichTextContentProps {
  content: unknown;
  className?: string;
  /** Smaller typography for cards / side panels */
  compact?: boolean;
}

export const RichTextContent: React.FC<RichTextContentProps> = ({
  content,
  className = '',
  compact = false,
}) => {
  const normalized = normalizeRichText(content);
  if (!normalized) return null;

  const sizeClass = compact ? 'text-sm' : 'text-base';

  if (isHtmlContent(normalized)) {
    return (
      <div
        className={`${HTML_WRAPPER} ${sizeClass} ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(normalized) }}
      />
    );
  }

  return (
    <div className={`${PROSE_WRAPPER} ${sizeClass} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ ...props }) => (
            <p className="text-content-secondary leading-relaxed mb-4 last:mb-0" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="text-content-secondary leading-relaxed mb-2" {...props} />
          ),
          strong: ({ ...props }) => <strong className="text-primary font-bold" {...props} />,
          h2: ({ ...props }) => (
            <h2 className="text-lg font-bold text-content mt-4 mb-2" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-base font-bold text-primary mt-3 mb-2" {...props} />
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
};
