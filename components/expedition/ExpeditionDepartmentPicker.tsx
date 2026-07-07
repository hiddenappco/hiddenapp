import React, { useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { Language } from '../../types/core';

import { useDepartments, useUserExpeditions } from '../../hooks/useFirestore';

import { useTranslation } from '../../hooks/useTranslation';

import { useRevenueCat } from '../layout/RevenueCatProvider';

import { normalizeImage } from '../../utils/imageHelpers';

import { setLastDepartmentId } from '../../utils/lastDepartment';

import { isExpeditionPlannerLocked } from '../../utils/expeditionPlanner';

import { PageLoadingScreen } from '../ui/PageLoadingScreen';

import { ExpeditionPreviousPlans } from './ExpeditionPreviousPlans';

import { ExpeditionPlannerManual } from './ExpeditionPlannerManual';

import { FeatureCoachmark } from '../ui/FeatureCoachmark';

import { useFeatureTooltip } from '../../hooks/useFeatureTooltip';

import { useHardwareBackHandler } from '../../hooks/useHardwareBackHandler';
import { StickyGlassHeader } from '../ui/StickyGlassHeader';

import { computeExpeditionQuotaDisplay } from '../../utils/premiumAccess';

import { useUserProfile } from '../../hooks/useSocial';

import { useAuth } from '../layout/AuthProvider';

import { EXPEDITION_HISTORY_LIMIT } from '../../config/constants';



interface ExpeditionDepartmentPickerProps {

    language: Language;

    onMenuClick: () => void;

}



export const ExpeditionDepartmentPicker: React.FC<ExpeditionDepartmentPickerProps> = ({ language, onMenuClick }) => {

    const { t } = useTranslation();

    const hubCoachmark = useFeatureTooltip('hub');

    const [showManual, setShowManual] = useState(false);

    const navigate = useNavigate();

    const { user } = useAuth();

    const { isPremium } = useRevenueCat();

    const { data: profile, loading: profileLoading } = useUserProfile(user?.uid);

    const { data: departments, loading } = useDepartments();

    const { data: savedPlans, loading: plansLoading } = useUserExpeditions(user?.uid);



    const departmentNameById = useMemo(() => {

        const map = new Map<string, string>();

        for (const dept of departments || []) {

            const key = dept.departmentId || dept.id;

            map.set(key, String(dept.name || key));

            map.set(dept.id, String(dept.name || dept.id));

        }

        return map;

    }, [departments]);



    const quota = computeExpeditionQuotaDisplay(isPremium ? profile : null);

    const historyFull = savedPlans.length >= EXPEDITION_HISTORY_LIMIT;



    const sorted = [...(departments || [])]

        .filter((d) => d.status !== 'coming_soon')

        .sort((a, b) => String(a.name).localeCompare(String(b.name)));



    const pick = (dept: (typeof sorted)[0]) => {

        const id = dept.departmentId || dept.id;

        if (isExpeditionPlannerLocked(id, dept)) return;



        if (!isPremium) {

            navigate('/premium');

            return;

        }



        if (historyFull) {

            window.alert(

                t('expedition.historyFullBlock').replace('{limit}', String(EXPEDITION_HISTORY_LIMIT))

            );

            return;

        }



        if (!quota.allowed) return;



        setLastDepartmentId(id);

        navigate(`/expedition/plan/${id}`);

    };



    const departmentDisabled = (plannerLocked: boolean) =>

        plannerLocked || historyFull || (isPremium && !quota.allowed);



    useHardwareBackHandler(() => {

        if (showManual) {

            setShowManual(false);

            return true;

        }

        return false;

    }, [showManual]);



    if (showManual) {

        return <ExpeditionPlannerManual onBack={() => setShowManual(false)} />;

    }



    if (loading || plansLoading) {

        return <PageLoadingScreen titleKey="expedition.loadingPicker" />;

    }



    return (

        <div className="flex flex-col h-screen bg-background-dark text-content overflow-hidden">

            <StickyGlassHeader
                onMenuClick={onMenuClick}
                center={
                    <div className="text-left min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                            {t('expedition.hubTitle')}
                        </p>
                        <h1 className="font-bold text-base truncate">{t('expedition.pickDepartmentTitle')}</h1>
                    </div>
                }
            />



            <div className="flex-1 overflow-y-auto px-4 pt-5 pb-[calc(1.25rem+var(--safe-bottom))] no-scrollbar">

                {hubCoachmark.visible && (
                    <FeatureCoachmark
                        title={t('coachmark.hubTitle')}
                        body={t('coachmark.hubBody')}
                        dismissLabel={t('coachmark.dismiss')}
                        onDismiss={hubCoachmark.dismiss}
                        className="mb-4"
                    />
                )}

                <section
                    onClick={() => setShowManual(true)}
                    className="relative overflow-hidden rounded-[20px] bg-surface-dark dark:bg-gradient-to-r dark:from-[#121d2b] dark:to-[#0a1525] p-3 px-4 border border-overlay/10 hover:border-primary/30 shadow-md dark:shadow-black/20 transition-all duration-300 group cursor-pointer mb-4"
                >
                    <div
                        className="absolute inset-0 opacity-[0.02] pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(249,115,22,0.5) 1px, transparent 1px)',
                            backgroundSize: '16px 16px',
                        }}
                    />
                    <div className="flex items-center justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="size-9 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-300">
                                <span className="material-symbols-outlined text-primary text-lg group-hover:scale-110 transition-transform duration-300">
                                    menu_book
                                </span>
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-black text-content group-hover:text-primary transition-colors duration-300 flex items-center gap-2 truncate">
                                    {t('expedition.manualTitle')}
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider shrink-0">
                                        {t('expedition.guide')}
                                    </span>
                                </h3>
                                <p className="text-[10px] text-content/50 hidden sm:block mt-0.5 line-clamp-2">
                                    {t('expedition.manualDesc')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5 group-hover:bg-primary group-hover:text-white group-hover:border-primary/40 transition-all duration-300 shrink-0">
                            <span>{t('expedition.read')}</span>
                            <span className="material-symbols-outlined text-[10px] group-hover:translate-x-0.5 transition-transform duration-300">
                                arrow_forward
                            </span>
                        </div>
                    </div>
                </section>

                {isPremium && quota.limit > 0 && (

                    <p className="text-[11px] text-content-muted mb-4 rounded-xl border border-overlay/10 bg-surface-dark px-3 py-2">

                        {t('expedition.quotaBanner')

                            .replace('{remaining}', String(quota.remaining))

                            .replace('{limit}', String(quota.limit))}

                    </p>

                )}



                {!isPremium && !profileLoading && (

                    <p className="text-[11px] text-content-muted mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">

                        {t('expedition.pickDepartmentPremiumHint')}

                    </p>

                )}



                {isPremium && !quota.allowed && (

                    <p className="text-[11px] text-amber-200/90 mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2">

                        {t('expedition.quotaExceeded')}

                    </p>

                )}



                {historyFull && (

                    <p className="text-[11px] text-amber-200/90 mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2">

                        {t('expedition.historyFullBlock').replace('{limit}', String(EXPEDITION_HISTORY_LIMIT))}

                    </p>

                )}



                <p className="text-content/65 text-[13px] leading-relaxed mb-5">

                    {t('expedition.pickDepartmentDesc')}

                </p>



                    <div className="flex flex-col gap-3">

                        {sorted.map((dept) => {

                            const deptKey = dept.departmentId || dept.id;

                            const plannerLocked = isExpeditionPlannerLocked(deptKey, dept);

                            const hero = normalizeImage(dept.heroImage);

                            const disabled = departmentDisabled(plannerLocked);

                            const showPremiumOnCard = !isPremium && !plannerLocked;



                            return (

                                <button

                                    key={dept.id}

                                    type="button"

                                    disabled={plannerLocked || (isPremium && (historyFull || !quota.allowed))}

                                    onClick={() => pick(dept)}

                                    className={`relative w-full h-[120px] rounded-2xl overflow-hidden text-left transition-all ${

                                        disabled && isPremium

                                            ? 'border border-overlay/10 opacity-75 cursor-not-allowed'

                                            : 'border border-overlay/15 hover:border-primary/40 active:scale-[0.99]'

                                    }`}

                                >

                                    <div

                                        className={`absolute inset-0 bg-cover bg-center ${plannerLocked ? 'grayscale-[35%]' : ''}`}

                                        style={{ backgroundImage: hero ? `url("${hero}")` : undefined }}

                                    />

                                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />

                                    <div className="relative z-10 h-full flex flex-col justify-center px-4 pr-24">

                                        <p className="text-white font-bold text-lg leading-tight">{dept.name}</p>

                                        <p className="text-white/70 text-[11px] mt-0.5">{dept.locationLabel || dept.subtitle}</p>

                                    </div>

                                    {plannerLocked ? (

                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 glass-pill text-white/90 border-white/20 bg-black/40">

                                            <span className="material-symbols-outlined text-[14px]">lock</span>

                                            {t('expedition.plannerComingSoon')}

                                        </div>

                                    ) : showPremiumOnCard ? (

                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 rounded-full border border-primary/40 bg-black/50 px-2.5 py-1">

                                            <span className="material-symbols-outlined text-primary text-[16px]">workspace_premium</span>

                                            <span className="text-[9px] font-black uppercase tracking-wide text-primary">Premium</span>

                                        </div>

                                    ) : (

                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary text-[24px]">

                                            arrow_forward

                                        </span>

                                    )}

                                </button>

                            );

                        })}

                    </div>



                <ExpeditionPreviousPlans

                    plans={savedPlans}

                    loading={plansLoading}

                    language={language}

                    departmentNameById={departmentNameById}

                />

            </div>

        </div>

    );

};


