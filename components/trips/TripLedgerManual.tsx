import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { BOTTOM_NAV_SCROLL_PADDING, BOTTOM_NAV_SCROLL_SPACER } from '../../utils/bottomNav';
import { StickyGlassHeader } from '../ui/StickyGlassHeader';

interface TripLedgerManualProps {
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
            <div className="size-8 rounded-xl bg-budget-primary/10 border border-budget-primary/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-budget-primary text-base">{icon}</span>
            </div>
            <div className="min-w-0">
                {label && (
                    <p className="text-content/40 text-[9px] font-bold uppercase tracking-widest">{label}</p>
                )}
                <h3 className="text-sm font-black text-content leading-snug">{title}</h3>
            </div>
        </div>
        {subtitle && (
            <p className="text-[10px] text-budget-primary/80 font-bold uppercase tracking-widest mb-3">{subtitle}</p>
        )}
        {children}
    </section>
);

const InfoBlock: React.FC<{ icon: string; title: string; body: string }> = ({ icon, title, body }) => (
    <div className="p-4 rounded-2xl bg-overlay/5 dark:bg-black/20 border border-overlay/5">
        <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-budget-primary text-sm shrink-0">{icon}</span>
            <p className="text-xs font-bold text-content">{title}</p>
        </div>
        <p className="text-xs text-content/60 leading-relaxed">{body}</p>
    </div>
);

export const TripLedgerManual: React.FC<TripLedgerManualProps> = ({ onBack }) => {
    const { t } = useTranslation();

    const quickStartSteps = [
        t('budget.manual.quickStartStep1'),
        t('budget.manual.quickStartStep2'),
        t('budget.manual.quickStartStep3'),
        t('budget.manual.quickStartStep4'),
    ];

    const offlineSteps = [
        t('budget.manual.offlineStep1'),
        t('budget.manual.offlineStep2'),
        t('budget.manual.offlineStep3'),
        t('budget.manual.offlineStep4'),
    ];

    const checklist = [
        t('budget.manual.checklist1'),
        t('budget.manual.checklist2'),
        t('budget.manual.checklist3'),
        t('budget.manual.checklist4'),
        t('budget.manual.checklist5'),
    ];

    return (
        <div className="bg-background-dark font-display text-content antialiased h-screen w-full flex flex-col overflow-hidden relative selection:bg-budget-primary selection:text-white">
            <StickyGlassHeader onBack={onBack} title={t('budget.manual.title')} titleLarge showLogo={false} />

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
                    <span className="material-symbols-outlined text-budget-primary text-5xl mb-3 block drop-shadow-lg">
                        menu_book
                    </span>
                    <h1 className="text-xl font-black tracking-tight text-content mb-2">
                        {t('budget.manual.title')}
                    </h1>
                    <p className="text-xs text-content/60 leading-relaxed max-w-[340px] mx-auto">
                        {t('budget.manual.subtitle')}
                    </p>
                </section>

                <ManualCard icon="explore" title={t('budget.manual.introTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed">{t('budget.manual.introBody')}</p>
                </ManualCard>

                <ManualCard
                    icon="rocket_launch"
                    label={t('budget.manual.quickStartLabel')}
                    title={t('budget.manual.quickStartTitle')}
                >
                    <ol className="flex flex-col gap-3">
                        {quickStartSteps.map((step, i) => (
                            <li key={i} className="flex gap-3 text-xs text-content/60 leading-relaxed">
                                <span className="size-6 shrink-0 rounded-full bg-budget-primary/10 border border-budget-primary/20 flex items-center justify-center text-[10px] font-black text-budget-primary">
                                    {i + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                            </li>
                        ))}
                    </ol>
                </ManualCard>

                <ManualCard
                    icon="person"
                    label={t('budget.manual.soloLabel')}
                    title={t('budget.manual.soloTitle')}
                >
                    <div className="flex flex-col gap-4">
                        <InfoBlock
                            icon="verified"
                            title={t('budget.manual.soloWhatTitle')}
                            body={t('budget.manual.soloWhatBody')}
                        />
                        <InfoBlock
                            icon="add_circle"
                            title={t('budget.manual.soloHowTitle')}
                            body={t('budget.manual.soloHowBody')}
                        />
                        <InfoBlock
                            icon="archive"
                            title={t('budget.manual.soloFinishTitle')}
                            body={t('budget.manual.soloFinishBody')}
                        />
                    </div>
                </ManualCard>

                <ManualCard
                    icon="groups"
                    label={t('budget.manual.groupLabel')}
                    title={t('budget.manual.groupTitle')}
                >
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('budget.manual.groupIntro')}</p>
                    <div className="flex flex-col gap-4">
                        <InfoBlock
                            icon="qr_code_2"
                            title={t('budget.manual.groupCodeTitle')}
                            body={t('budget.manual.groupCodeBody')}
                        />
                        <InfoBlock
                            icon="shield_person"
                            title={t('budget.manual.groupRoleOwnerTitle')}
                            body={t('budget.manual.groupRoleOwnerBody')}
                        />
                        <InfoBlock
                            icon="edit_note"
                            title={t('budget.manual.groupRoleEditorTitle')}
                            body={t('budget.manual.groupRoleEditorBody')}
                        />
                        <InfoBlock
                            icon="visibility"
                            title={t('budget.manual.groupRoleObserverTitle')}
                            body={t('budget.manual.groupRoleObserverBody')}
                        />
                        <InfoBlock
                            icon="group_add"
                            title={t('budget.manual.groupJoinTitle')}
                            body={t('budget.manual.groupJoinBody')}
                        />
                    </div>
                </ManualCard>

                <ManualCard
                    icon="receipt_long"
                    label={t('budget.manual.expensesLabel')}
                    title={t('budget.manual.expensesTitle')}
                >
                    <div className="flex flex-col gap-4">
                        <InfoBlock
                            icon="add_card"
                            title={t('budget.manual.expensesAddTitle')}
                            body={t('budget.manual.expensesAddBody')}
                        />
                        <InfoBlock
                            icon="category"
                            title={t('budget.manual.expensesCategoriesTitle')}
                            body={t('budget.manual.expensesCategoriesBody')}
                        />
                        <InfoBlock
                            icon="swipe_left"
                            title={t('budget.manual.expensesDeleteTitle')}
                            body={t('budget.manual.expensesDeleteBody')}
                        />
                        <InfoBlock
                            icon="account_balance_wallet"
                            title={t('budget.manual.expensesBalancesTitle')}
                            body={t('budget.manual.expensesBalancesBody')}
                        />
                    </div>
                </ManualCard>

                <ManualCard
                    icon="folder"
                    label={t('budget.manual.documentsLabel')}
                    title={t('budget.manual.documentsTitle')}
                >
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('budget.manual.documentsIntro')}</p>
                    <div className="flex flex-col gap-4">
                        <InfoBlock
                            icon="upload_file"
                            title={t('budget.manual.documentsAttachTitle')}
                            body={t('budget.manual.documentsAttachBody')}
                        />
                        <InfoBlock
                            icon="edit"
                            title={t('budget.manual.documentsNameTitle')}
                            body={t('budget.manual.documentsNameBody')}
                        />
                        <InfoBlock
                            icon="link"
                            title={t('budget.manual.documentsLinkTitle')}
                            body={t('budget.manual.documentsLinkBody')}
                        />
                        <InfoBlock
                            icon="sd_storage"
                            title={t('budget.manual.documentsStorageTitle')}
                            body={t('budget.manual.documentsStorageBody')}
                        />
                        <InfoBlock
                            icon="shield_person"
                            title={t('budget.manual.documentsRolesTitle')}
                            body={t('budget.manual.documentsRolesBody')}
                        />
                    </div>
                </ManualCard>

                <ManualCard
                    icon="signal_wifi_off"
                    label={t('budget.manual.offlineLabel')}
                    title={t('budget.manual.offlineTitle')}
                >
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('budget.manual.offlineBody')}</p>
                    <ol className="flex flex-col gap-3">
                        {offlineSteps.map((step, i) => (
                            <li key={i} className="flex gap-3 text-xs text-content/60 leading-relaxed">
                                <span className="size-6 shrink-0 rounded-full bg-budget-primary/10 border border-budget-primary/20 flex items-center justify-center text-[10px] font-black text-budget-primary">
                                    {i + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                            </li>
                        ))}
                    </ol>
                </ManualCard>

                <ManualCard icon="cloud_done" title={t('budget.manual.onlineTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('budget.manual.onlineBody')}</p>
                    <div className="flex flex-col gap-4">
                        <InfoBlock
                            icon="sync"
                            title={t('budget.manual.onlineSyncTitle')}
                            body={t('budget.manual.onlineSyncBody')}
                        />
                        <InfoBlock
                            icon="dynamic_feed"
                            title={t('budget.manual.onlineFeedTitle')}
                            body={t('budget.manual.onlineFeedBody')}
                        />
                    </div>
                </ManualCard>

                <ManualCard icon="currency_exchange" title={t('budget.manual.currencyTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('budget.manual.currencyIntro')}</p>
                    <div className="flex flex-col gap-4">
                        <InfoBlock
                            icon="payments"
                            title={t('budget.manual.currencyCopTitle')}
                            body={t('budget.manual.currencyCopBody')}
                        />
                        <InfoBlock
                            icon="attach_money"
                            title={t('budget.manual.currencyForeignTitle')}
                            body={t('budget.manual.currencyForeignBody')}
                        />
                        <InfoBlock
                            icon="currency_exchange"
                            title={t('budget.manual.currencyConverterTitle')}
                            body={t('budget.manual.currencyConverterBody')}
                        />
                    </div>
                </ManualCard>

                <ManualCard icon="picture_as_pdf" title={t('budget.manual.pdfTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed">{t('budget.manual.pdfBody')}</p>
                </ManualCard>

                <ManualCard icon="person_add" title={t('budget.manual.guestTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed">{t('budget.manual.guestBody')}</p>
                </ManualCard>

                <ManualCard icon="sync_problem" title={t('budget.manual.syncTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('budget.manual.syncBody')}</p>
                    <InfoBlock
                        icon="tips_and_updates"
                        title={t('budget.manual.syncTipTitle')}
                        body={t('budget.manual.syncTipBody')}
                    />
                </ManualCard>

                <ManualCard icon="checklist" title={t('budget.manual.checklistTitle')}>
                    <ul className="flex flex-col gap-2.5">
                        {checklist.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-content/60 leading-relaxed">
                                <span className="material-symbols-outlined text-budget-primary text-sm shrink-0">check_circle</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </ManualCard>

                <section className="relative shrink-0 overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#121d2b] dark:to-[#0a1525] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30 text-center">
                    <span className="material-symbols-outlined text-budget-primary/30 text-4xl mb-3 block">tips_and_updates</span>
                    <p className="text-xs text-content/50 leading-relaxed max-w-[320px] mx-auto">{t('budget.manual.proTip')}</p>
                </section>

                <div className={`${BOTTOM_NAV_SCROLL_SPACER} w-full shrink-0`} aria-hidden="true" />
            </main>
        </div>
    );
};
