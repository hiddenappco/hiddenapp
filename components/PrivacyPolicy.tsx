import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getLegalContent } from '../locales/legalContent';
import {
    LegalContactFooter,
    LegalPageShell,
    LegalSectionAccordion,
    sectionIcon,
} from './legal/LegalPageShell';

interface PrivacyPolicyProps {
    onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
    const { currentLanguage } = useLanguage();
    const legal = getLegalContent(currentLanguage);
    const { privacy, meta, ui } = legal;

    return (
        <LegalPageShell
            pageTitle={privacy.pageTitle}
            heroTitle={privacy.heroTitle}
            heroHighlight={privacy.heroHighlight}
            updated={meta.updated}
            version={meta.version}
            intro={privacy.intro}
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
            {privacy.sections.map((section, index) => (
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
