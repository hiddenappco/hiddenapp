import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export interface PageLoadingScreenProps {
    /** i18n key for primary message (default: common.loadingPage) */
    titleKey?: string;
    /** i18n key for secondary hint (default: common.loadingPageHint) */
    hintKey?: string;
}

/**
 * Full-screen gate: hide page chrome until all required data is ready.
 * Same pattern as PactGate — avoids partial renders (header + skeleton + late counts).
 */
export const PageLoadingScreen: React.FC<PageLoadingScreenProps> = ({
    titleKey = 'common.loadingPage',
    hintKey = 'common.loadingPageHint',
}) => {
    const { t } = useTranslation();

    return (
        <div
            className="h-screen w-full bg-background-dark text-content flex flex-col items-center justify-center gap-4 px-8 font-display"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <div
                className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"
                aria-hidden="true"
            />
            <p className="font-semibold text-base text-center">{t(titleKey)}</p>
            <p className="text-sm text-content-muted text-center max-w-xs leading-relaxed">
                {t(hintKey)}
            </p>
        </div>
    );
};
