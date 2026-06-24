import React from 'react';

interface LegalPageShellProps {
    pageTitle: string;
    heroTitle: string;
    heroHighlight: string;
    updated: string;
    version: string;
    intro: string;
    legalDocLabel: string;
    onBack: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const LegalPageShell: React.FC<LegalPageShellProps> = ({
    pageTitle,
    heroTitle,
    heroHighlight,
    updated,
    version,
    intro,
    legalDocLabel,
    onBack,
    children,
    footer,
}) => (
    <div className="bg-background-dark font-display text-content antialiased h-screen w-full flex flex-col overflow-hidden relative z-50">
        <header className="sticky top-0 z-20 bg-background-dark/95 backdrop-blur-sm border-b border-overlay/5 shrink-0">
            <div className="flex items-center justify-between p-4 pb-3 pt-safe-hero">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Go back"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-primary text-2xl">arrow_back_ios_new</span>
                </button>
                <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10 truncate">
                    {pageTitle}
                </h2>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
            <div className="px-6 pt-6 pb-2">
                <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-green-400 text-3xl">gavel</span>
                    <p className="text-content-muted text-xs font-medium uppercase tracking-wider">{legalDocLabel}</p>
                </div>
                <h1 className="text-3xl font-extrabold leading-tight tracking-tight mb-2">
                    {heroTitle}{' '}
                    <span className="text-primary">{heroHighlight}</span>
                </h1>
                <p className="text-content-subtle text-sm font-medium">
                    v{version} · {updated}
                </p>
            </div>

            <div className="px-6 py-3">
                <p className="text-content-secondary text-[15px] leading-relaxed">{intro}</p>
            </div>

            <div className="flex flex-col px-4 gap-3 pb-6">{children}</div>

            {footer ? <div className="px-6 pb-12">{footer}</div> : null}
        </main>
    </div>
);

interface LegalSectionAccordionProps {
    icon: string;
    title: string;
    paragraphs: string[];
}

export const LegalSectionAccordion: React.FC<LegalSectionAccordionProps> = ({
    icon,
    title,
    paragraphs,
}) => (
    <details className="flex flex-col rounded-2xl bg-surface-dark border border-overlay/5 open:border-primary/20 transition-all duration-300 group">
        <summary className="flex cursor-pointer items-center justify-between gap-4 p-4 list-none">
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center size-8 rounded-full bg-overlay/5 text-content group-open:bg-primary group-open:text-white transition-colors shrink-0">
                    <span className="material-symbols-outlined text-lg">{icon}</span>
                </div>
                <p className="text-content text-sm font-bold leading-snug">{title}</p>
            </div>
            <span className="material-symbols-outlined text-content-muted group-open:rotate-180 group-open:text-primary transition-all shrink-0">
                expand_more
            </span>
        </summary>
        <div className="px-4 pb-4 pl-[3.75rem] space-y-3">
            {paragraphs.map((p, i) => (
                <p key={i} className="text-content-muted text-sm leading-relaxed">
                    {p}
                </p>
            ))}
        </div>
    </details>
);

export const LegalContactFooter: React.FC<{
    title: string;
    body: string;
    email: string;
    cta: string;
}> = ({ title, body, email, cta }) => (
    <div className="rounded-xl bg-emerald-900/40 border border-emerald-500/20 p-5 relative overflow-hidden">
        <h3 className="text-content text-base font-bold relative z-10">{title}</h3>
        <p className="text-emerald-100/80 text-sm mt-1 mb-4 relative z-10">{body}</p>
        <a
            href={`mailto:${email}`}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-white text-emerald-900 text-sm font-bold rounded-lg hover:bg-green-50 transition-colors w-full relative z-10"
        >
            <span className="material-symbols-outlined text-lg mr-2">mail</span>
            {cta}
        </a>
    </div>
);

const SECTION_ICONS = [
    'explore',
    'cloud',
    'smart_toy',
    'workspace_premium',
    'sell',
    'eco',
    'copyright',
    'gavel',
    'sync',
    'balance',
    'database',
    'psychology',
    'settings',
    'share',
    'lock',
    'policy',
    'delete',
];

export function sectionIcon(index: number): string {
    return SECTION_ICONS[index % SECTION_ICONS.length];
}
