import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getLegalContent } from '../locales/legalContent';
import { LegalPageShell } from './legal/LegalPageShell';

interface FaqProps {
    onBack: () => void;
}

export const Faq: React.FC<FaqProps> = ({ onBack }) => {
    const { currentLanguage } = useLanguage();
    const { faq, meta, ui } = getLegalContent(currentLanguage);

    return (
        <LegalPageShell
            pageTitle={faq.pageTitle}
            heroTitle={faq.pageTitle}
            heroHighlight="Hidden App"
            updated={meta.updated}
            version={meta.version}
            intro={faq.intro}
            legalDocLabel={ui.legalDoc}
            onBack={onBack}
        >
            {faq.categories.map((category) => (
                <div key={category.id} className="mb-6">
                    <h3 className="text-base font-bold text-content px-2 mb-3">{category.title}</h3>
                    <div className="flex flex-col gap-2">
                        {category.items.map((item, idx) => (
                            <details
                                key={`${category.id}-${idx}`}
                                className="rounded-2xl bg-surface-dark border border-overlay/5 open:border-primary/20 transition-all group"
                            >
                                <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 list-none">
                                    <p className="text-sm font-semibold text-content text-left leading-snug">
                                        {item.q}
                                    </p>
                                    <span className="material-symbols-outlined text-content-muted group-open:rotate-180 group-open:text-primary transition-all shrink-0">
                                        expand_more
                                    </span>
                                </summary>
                                <div className="px-4 pb-4">
                                    <p className="text-sm text-content-muted leading-relaxed">{item.a}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            ))}
        </LegalPageShell>
    );
};
