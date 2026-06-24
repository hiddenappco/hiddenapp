import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getLegalContent } from '../locales/legalContent';
import {
    LegalContactFooter,
    LegalPageShell,
    LegalSectionAccordion,
    sectionIcon,
} from './legal/LegalPageShell';

interface TermsOfUseProps {
    onBack: () => void;
}

export const TermsOfUse: React.FC<TermsOfUseProps> = ({ onBack }) => {
    const { currentLanguage } = useLanguage();
    const legal = getLegalContent(currentLanguage);
    const { terms, meta, ui } = legal;

    return (
        <LegalPageShell
            pageTitle={terms.pageTitle}
            heroTitle={terms.heroTitle}
            heroHighlight={terms.heroHighlight}
            updated={meta.updated}
            version={meta.version}
            intro={terms.intro}
            legalDocLabel={ui.legalDoc}
            onBack={onBack}
            footer={
                <LegalContactFooter
                    title={ui.contactTitle}
                    body={ui.contactBody}
                    email={meta.contactLegal}
                    cta={ui.emailCta}
                />
            }
        >
            {terms.sections.map((section, index) => (
                <LegalSectionAccordion
                    key={section.id}
                    icon={sectionIcon(index)}
                    title={section.title}
                    paragraphs={section.paragraphs}
                />
            ))}
        </LegalPageShell>
    );
};
