import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { BOTTOM_NAV_SCROLL_PADDING, BOTTOM_NAV_SCROLL_SPACER } from '../../utils/bottomNav';
import { EXPEDITION_HISTORY_LIMIT } from '../../config/constants';

interface ExpeditionPlannerManualProps {
    onBack: () => void;
}

const ManualCard: React.FC<{
    icon: string;
    label?: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}> = ({ icon, label, title, subtitle, children }) => (
    <section className="relative shrink-0 rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#121d2b] dark:to-[#0a1525] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30">
        <div className="flex items-center gap-2 mb-4">
            <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-base">{icon}</span>
            </div>
            <div className="min-w-0">
                {label && (
                    <p className="text-content/40 text-[9px] font-bold uppercase tracking-widest">{label}</p>
                )}
                <h3 className="text-sm font-black text-content leading-snug">{title}</h3>
            </div>
        </div>
        {subtitle && (
            <p className="text-[10px] text-primary/80 font-bold uppercase tracking-widest mb-3">{subtitle}</p>
        )}
        {children}
    </section>
);

const InfoBlock: React.FC<{ icon: string; title: string; body: string }> = ({ icon, title, body }) => (
    <div className="p-4 rounded-2xl bg-overlay/5 dark:bg-black/20 border border-overlay/5">
        <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-sm shrink-0">{icon}</span>
            <p className="text-xs font-bold text-content">{title}</p>
        </div>
        <p className="text-xs text-content/60 leading-relaxed">{body}</p>
    </div>
);

export const ExpeditionPlannerManual: React.FC<ExpeditionPlannerManualProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const historyLimit = String(EXPEDITION_HISTORY_LIMIT);

    const quickStartSteps = [
        t('expedition.manual.quickStartStep1'),
        t('expedition.manual.quickStartStep2'),
        t('expedition.manual.quickStartStep3'),
        t('expedition.manual.quickStartStep4'),
    ];

    const agentSteps = [
        t('expedition.manual.agentStep1'),
        t('expedition.manual.agentStep2'),
        t('expedition.manual.agentStep3'),
        t('expedition.manual.agentStep4'),
    ];

    const wizardSteps = [
        t('expedition.manual.wizardStep1'),
        t('expedition.manual.wizardStep2'),
        t('expedition.manual.wizardStep3'),
        t('expedition.manual.wizardStep4'),
        t('expedition.manual.wizardStep5'),
    ];

    const checklist = [
        t('expedition.manual.checklist1'),
        t('expedition.manual.checklist2'),
        t('expedition.manual.checklist3'),
        t('expedition.manual.checklist4'),
        t('expedition.manual.checklist5'),
    ];

    return (
        <div className="bg-background-dark font-display text-content antialiased h-screen w-full flex flex-col overflow-hidden relative selection:bg-primary selection:text-white">
            <header className="sticky top-0 z-50 flex items-center gap-3 bg-background-dark/90 backdrop-blur-md px-4 pb-2 pt-safe border-b border-overlay/5 shrink-0">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center justify-center size-10 rounded-full text-content bg-surface-dark hover:bg-overlay/10 shadow-lg border border-overlay/10 transition-colors shrink-0"
                    aria-label={t('expedition.manual.backToPlanner')}
                >
                    <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                </button>
                <h2 className="flex-1 min-w-0 text-base font-bold leading-tight tracking-tight text-content truncate">
                    {t('expedition.manualTitle')}
                </h2>
            </header>

            <main
                className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar p-5 flex flex-col gap-6 ${BOTTOM_NAV_SCROLL_PADDING}`}
            >
                <section className="relative shrink-0 overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#121d2b] dark:to-[#0a1525] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30 text-center">
                    <div
                        className="absolute inset-0 opacity-[0.04] pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(249,115,22,0.5) 1px, transparent 1px)',
                            backgroundSize: '18px 18px',
                        }}
                    />
                    <span className="material-symbols-outlined text-primary text-5xl mb-3 block drop-shadow-lg">
                        explore
                    </span>
                    <h1 className="text-xl font-black tracking-tight text-content mb-2">
                        {t('expedition.manualTitle')}
                    </h1>
                    <p className="text-xs text-content/60 leading-relaxed max-w-[340px] mx-auto">
                        {t('expedition.manual.subtitle')}
                    </p>
                </section>

                <ManualCard icon="explore" title={t('expedition.manual.introTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed">{t('expedition.manual.introBody')}</p>
                </ManualCard>

                <ManualCard
                    icon="rocket_launch"
                    label={t('expedition.manual.quickStartLabel')}
                    title={t('expedition.manual.quickStartTitle')}
                >
                    <ol className="flex flex-col gap-3">
                        {quickStartSteps.map((step, i) => (
                            <li key={i} className="flex gap-3 text-xs text-content/60 leading-relaxed">
                                <span className="size-6 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                                    {i + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                            </li>
                        ))}
                    </ol>
                </ManualCard>

                <ManualCard
                    icon="workspace_premium"
                    label={t('expedition.manual.premiumLabel')}
                    title={t('expedition.manual.premiumTitle')}
                >
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('expedition.manual.premiumBody')}</p>
                    <div className="flex flex-col gap-4">
                        <InfoBlock
                            icon="confirmation_number"
                            title={t('expedition.manual.quotaTripPassTitle')}
                            body={t('expedition.manual.quotaTripPassBody')}
                        />
                        <InfoBlock
                            icon="calendar_month"
                            title={t('expedition.manual.quotaMonthlyTitle')}
                            body={t('expedition.manual.quotaMonthlyBody')}
                        />
                        <InfoBlock
                            icon="folder_open"
                            title={t('expedition.manual.historyTitle', { limit: historyLimit })}
                            body={t('expedition.manual.historyBody', { limit: historyLimit })}
                        />
                    </div>
                </ManualCard>

                <ManualCard
                    icon="map"
                    label={t('expedition.manual.hubLabel')}
                    title={t('expedition.manual.hubTitle')}
                >
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('expedition.manual.hubBody')}</p>
                    <InfoBlock
                        icon="lock"
                        title={t('expedition.manual.lockedDeptTitle')}
                        body={t('expedition.manual.lockedDeptBody')}
                    />
                </ManualCard>

                <ManualCard
                    icon="edit_road"
                    label={t('expedition.manual.wizardLabel')}
                    title={t('expedition.manual.wizardTitle')}
                    subtitle={t('expedition.manual.wizardSubtitle')}
                >
                    <ol className="flex flex-col gap-3 mb-4">
                        {wizardSteps.map((step, i) => (
                            <li key={i} className="flex gap-3 text-xs text-content/60 leading-relaxed">
                                <span className="size-6 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                                    {i + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                            </li>
                        ))}
                    </ol>
                    <div className="flex flex-col gap-4">
                        <InfoBlock
                            icon="notes"
                            title={t('expedition.manual.travelerNotesTitle')}
                            body={t('expedition.manual.travelerNotesBody')}
                        />
                        <InfoBlock
                            icon="pin_drop"
                            title={t('expedition.manual.mustVisitTitle')}
                            body={t('expedition.manual.mustVisitBody')}
                        />
                    </div>
                </ManualCard>

                <ManualCard
                    icon="groups"
                    label={t('expedition.manual.agentsLabel')}
                    title={t('expedition.manual.agentsTitle')}
                >
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('expedition.manual.agentsBody')}</p>
                    <ol className="flex flex-col gap-3">
                        {agentSteps.map((step, i) => (
                            <li key={i} className="flex gap-3 text-xs text-content/60 leading-relaxed">
                                <span className="size-6 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                                    {i + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                            </li>
                        ))}
                    </ol>
                </ManualCard>

                <ManualCard icon="route" title={t('expedition.manual.resultTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('expedition.manual.resultBody')}</p>
                    <div className="flex flex-col gap-4">
                        <InfoBlock icon="today" title={t('expedition.manual.resultDaysTitle')} body={t('expedition.manual.resultDaysBody')} />
                        <InfoBlock icon="payments" title={t('expedition.manual.resultBudgetTitle')} body={t('expedition.manual.resultBudgetBody')} />
                        <InfoBlock icon="local_offer" title={t('expedition.manual.resultCouponsTitle')} body={t('expedition.manual.resultCouponsBody')} />
                        <InfoBlock icon="picture_as_pdf" title={t('expedition.manual.resultPdfTitle')} body={t('expedition.manual.resultPdfBody')} />
                    </div>
                </ManualCard>

                <ManualCard icon="sync" title={t('expedition.manual.revisionTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('expedition.manual.revisionBody')}</p>
                    <InfoBlock
                        icon="edit_note"
                        title={t('expedition.manual.revisionIncludedTitle')}
                        body={t('expedition.manual.revisionIncludedBody')}
                    />
                </ManualCard>

                <ManualCard icon="block" title={t('expedition.manual.limitsTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed">{t('expedition.manual.limitsBody')}</p>
                </ManualCard>

                <ManualCard icon="checklist" title={t('expedition.manual.checklistTitle')}>
                    <ul className="flex flex-col gap-2.5">
                        {checklist.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-content/60 leading-relaxed">
                                <span className="material-symbols-outlined text-primary text-sm shrink-0">check_circle</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </ManualCard>

                <section className="relative shrink-0 overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#121d2b] dark:to-[#0a1525] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30 text-center">
                    <span className="material-symbols-outlined text-primary/30 text-4xl mb-3 block">tips_and_updates</span>
                    <p className="text-xs text-content/50 leading-relaxed max-w-[320px] mx-auto">{t('expedition.manual.proTip')}</p>
                </section>

                <div className={`${BOTTOM_NAV_SCROLL_SPACER} w-full shrink-0`} aria-hidden="true" />
            </main>
        </div>
    );
};
