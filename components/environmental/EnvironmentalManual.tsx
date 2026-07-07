import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { BOTTOM_NAV_SCROLL_PADDING, BOTTOM_NAV_SCROLL_SPACER } from '../../utils/bottomNav';
import { StickyGlassHeader } from '../ui/StickyGlassHeader';

interface EnvironmentalManualProps {
    onBack: () => void;
}

const ManualCard: React.FC<{
    icon: string;
    label?: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}> = ({ icon, label, title, subtitle, children }) => (
    <section className="relative shrink-0 rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30">
        <div className="flex items-center gap-2 mb-4">
            <div className="size-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-green-400 text-base">{icon}</span>
            </div>
            <div className="min-w-0">
                {label && (
                    <p className="text-content/40 text-[9px] font-bold uppercase tracking-widest">{label}</p>
                )}
                <h3 className="text-sm font-black text-content leading-snug">{title}</h3>
            </div>
        </div>
        {subtitle && (
            <p className="text-[10px] text-green-400/80 font-bold uppercase tracking-widest mb-3">{subtitle}</p>
        )}
        {children}
    </section>
);

const InfoBlock: React.FC<{ icon: string; title: string; body: string }> = ({ icon, title, body }) => (
    <div className="p-4 rounded-2xl bg-overlay/5 dark:bg-black/20 border border-overlay/5">
        <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-green-400 text-sm shrink-0">{icon}</span>
            <p className="text-xs font-bold text-content">{title}</p>
        </div>
        <p className="text-xs text-content/60 leading-relaxed">{body}</p>
    </div>
);

export const EnvironmentalManual: React.FC<EnvironmentalManualProps> = ({ onBack }) => {
    const { t } = useTranslation();

    const quickStartSteps = [
        t('environmental.manual.quickStartStep1'),
        t('environmental.manual.quickStartStep2'),
        t('environmental.manual.quickStartStep3'),
        t('environmental.manual.quickStartStep4'),
    ];

    const shieldSteps = [
        t('environmental.manual.shieldStep1'),
        t('environmental.manual.shieldStep2'),
        t('environmental.manual.shieldStep3'),
    ];

    const checklist = [
        t('environmental.manual.checklist1'),
        t('environmental.manual.checklist2'),
        t('environmental.manual.checklist3'),
        t('environmental.manual.checklist4'),
        t('environmental.manual.checklist5'),
    ];

    return (
        <div className="bg-background-dark font-display text-content antialiased h-screen w-full flex flex-col overflow-hidden relative selection:bg-green-500 selection:text-white">
            <StickyGlassHeader onBack={onBack} title={t('environmental.manualTitle')} titleLarge showLogo={false} />

            <main
                className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar p-5 flex flex-col gap-6 ${BOTTOM_NAV_SCROLL_PADDING}`}
            >
                <section className="relative shrink-0 overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30 text-center">
                    <div
                        className="absolute inset-0 opacity-[0.04] pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(34,197,94,0.5) 1px, transparent 1px)',
                            backgroundSize: '18px 18px',
                        }}
                    />
                    <span className="material-symbols-outlined text-green-400 text-5xl mb-3 block drop-shadow-lg">
                        shield
                    </span>
                    <h1 className="text-xl font-black tracking-tight text-content mb-2">
                        {t('environmental.manualTitle')}
                    </h1>
                    <p className="text-xs text-content/60 leading-relaxed max-w-[340px] mx-auto">
                        {t('environmental.manual.subtitle')}
                    </p>
                </section>

                <ManualCard icon="explore" title={t('environmental.manual.introTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed">{t('environmental.manual.introBody')}</p>
                </ManualCard>

                <ManualCard
                    icon="rocket_launch"
                    label={t('environmental.manual.quickStartLabel')}
                    title={t('environmental.manual.quickStartTitle')}
                >
                    <ol className="flex flex-col gap-3">
                        {quickStartSteps.map((step, i) => (
                            <li key={i} className="flex gap-3 text-xs text-content/60 leading-relaxed">
                                <span className="size-6 shrink-0 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-[10px] font-black text-green-400">
                                    {i + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                            </li>
                        ))}
                    </ol>
                </ManualCard>

                <ManualCard
                    icon="shield"
                    label={t('environmental.manual.shieldLabel')}
                    title={t('environmental.manual.shieldTitle')}
                >
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('environmental.manual.shieldBody')}</p>
                    <div className="flex flex-col gap-4 mb-4">
                        <InfoBlock
                            icon="toggle_on"
                            title={t('environmental.manual.shieldOnTitle')}
                            body={t('environmental.manual.shieldOnBody')}
                        />
                        <InfoBlock
                            icon="toggle_off"
                            title={t('environmental.manual.shieldOffTitle')}
                            body={t('environmental.manual.shieldOffBody')}
                        />
                        <InfoBlock
                            icon="schedule"
                            title={t('environmental.manual.shieldExpiryTitle')}
                            body={t('environmental.manual.shieldExpiryBody')}
                        />
                    </div>
                    <ol className="flex flex-col gap-3">
                        {shieldSteps.map((step, i) => (
                            <li key={i} className="flex gap-3 text-xs text-content/60 leading-relaxed">
                                <span className="size-6 shrink-0 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-[10px] font-black text-green-400">
                                    {i + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                            </li>
                        ))}
                    </ol>
                </ManualCard>

                <ManualCard icon="travel_explore" title={t('environmental.manual.destinationTitle')}>
                    <div className="flex flex-col gap-4">
                        <InfoBlock
                            icon="search"
                            title={t('environmental.manual.destinationSearchTitle')}
                            body={t('environmental.manual.destinationSearchBody')}
                        />
                        <InfoBlock
                            icon="close"
                            title={t('environmental.manual.destinationClearTitle')}
                            body={t('environmental.manual.destinationClearBody')}
                        />
                        <InfoBlock
                            icon="location_off"
                            title={t('environmental.manual.destinationCoordsTitle')}
                            body={t('environmental.manual.destinationCoordsBody')}
                        />
                    </div>
                </ManualCard>

                <ManualCard icon="verified_user" title={t('environmental.manual.autoAnalysisTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('environmental.manual.autoAnalysisBody')}</p>
                    <InfoBlock
                        icon="update"
                        title={t('environmental.manual.refreshTitle')}
                        body={t('environmental.manual.refreshBody')}
                    />
                </ManualCard>

                <ManualCard
                    icon="forum"
                    label={t('environmental.manual.rangerLabel')}
                    title={t('environmental.manual.rangerTitle')}
                >
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('environmental.manual.rangerBody')}</p>
                    <div className="flex flex-col gap-4">
                        <InfoBlock
                            icon="smart_toy"
                            title={t('environmental.manual.rangerVsAutoTitle')}
                            body={t('environmental.manual.rangerVsAutoBody')}
                        />
                        <InfoBlock
                            icon="speed"
                            title={t('environmental.manual.rangerQuotaTitle')}
                            body={t('environmental.manual.rangerQuotaBody')}
                        />
                    </div>
                </ManualCard>

                <ManualCard icon="grid_view" title={t('environmental.manual.telemetryTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('environmental.manual.telemetryBody')}</p>
                    <div className="flex flex-col gap-4">
                        <InfoBlock icon="thermostat" title={t('environmental.manual.telemetryWeatherTitle')} body={t('environmental.manual.telemetryWeatherBody')} />
                        <InfoBlock icon="air" title={t('environmental.manual.telemetryAqiTitle')} body={t('environmental.manual.telemetryAqiBody')} />
                        <InfoBlock icon="wb_sunny" title={t('environmental.manual.telemetryUvTitle')} body={t('environmental.manual.telemetryUvBody')} />
                        <InfoBlock icon="water_drop" title={t('environmental.manual.telemetryRainTitle')} body={t('environmental.manual.telemetryRainBody')} />
                        <InfoBlock icon="waves" title={t('environmental.manual.telemetryOceanTitle')} body={t('environmental.manual.telemetryOceanBody')} />
                    </div>
                </ManualCard>

                <ManualCard icon="satellite_alt" title={t('environmental.manual.radarTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed">{t('environmental.manual.radarBody')}</p>
                </ManualCard>

                <ManualCard
                    icon="notifications_active"
                    label={t('environmental.manual.guardLabel')}
                    title={t('environmental.manual.guardTitle')}
                >
                    <p className="text-xs text-content/70 leading-relaxed mb-4">{t('environmental.manual.guardBody')}</p>
                    <InfoBlock
                        icon="tune"
                        title={t('environmental.manual.guardPrefsTitle')}
                        body={t('environmental.manual.guardPrefsBody')}
                    />
                </ManualCard>

                <ManualCard icon="signal_wifi_off" title={t('environmental.manual.offlineTitle')}>
                    <p className="text-xs text-content/70 leading-relaxed">{t('environmental.manual.offlineBody')}</p>
                </ManualCard>

                <ManualCard icon="checklist" title={t('environmental.manual.checklistTitle')}>
                    <ul className="flex flex-col gap-2.5">
                        {checklist.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-content/60 leading-relaxed">
                                <span className="material-symbols-outlined text-green-400 text-sm shrink-0">check_circle</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </ManualCard>

                <section className="relative shrink-0 overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30 text-center">
                    <span className="material-symbols-outlined text-green-400/30 text-4xl mb-3 block">tips_and_updates</span>
                    <p className="text-xs text-content/50 leading-relaxed max-w-[320px] mx-auto">{t('environmental.manual.proTip')}</p>
                </section>

                <div className={`${BOTTOM_NAV_SCROLL_SPACER} w-full shrink-0`} aria-hidden="true" />
            </main>
        </div>
    );
};
