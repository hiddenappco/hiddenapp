import React, { useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import { Language } from '../../types/core';

import { useDepartments, useUserExpeditions } from '../../hooks/useFirestore';

import { useTranslation } from '../../hooks/useTranslation';

import { useRevenueCat } from '../layout/RevenueCatProvider';

import { normalizeImage } from '../../utils/imageHelpers';

import { setLastDepartmentId } from '../../utils/lastDepartment';

import { isExpeditionPlannerLocked } from '../../utils/expeditionPlanner';

import { DepartmentListSkeleton } from '../ui/ContentSkeleton';

import { ExpeditionPreviousPlans } from './ExpeditionPreviousPlans';

import { FeatureCoachmark } from '../ui/FeatureCoachmark';

import { useFeatureTooltip } from '../../hooks/useFeatureTooltip';

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



    return (

        <div className="flex flex-col h-screen bg-background-dark text-content overflow-hidden">

            <header className="sticky top-0 z-50 shrink-0 flex items-center bg-background-dark/95 backdrop-blur-md px-4 pb-2 pt-safe justify-between border-b border-overlay/10">

                <div className="flex items-center gap-2 min-w-0 flex-1">

                    <button

                        type="button"

                        onClick={onMenuClick}

                        className="flex items-center justify-center size-10 rounded-full text-content-secondary dark:text-white bg-surface-dark dark:bg-secondary hover:bg-overlay/10 dark:hover:bg-[#0a1f35] shadow-sm border border-overlay/10 transition-colors active:scale-95 shrink-0"

                    >

                        <span className="material-symbols-outlined text-2xl">menu</span>

                    </button>

                    <div className="min-w-0 flex-1">

                        <p className="text-[9px] font-black uppercase tracking-widest text-primary">

                            {t('expedition.hubTitle')}

                        </p>

                        <h1 className="font-bold text-base truncate">{t('expedition.pickDepartmentTitle')}</h1>

                    </div>

                </div>

                <img src="/assets/ui/logo.png" alt="Hidden Logo" className="h-8 object-contain shrink-0 ml-2" />

            </header>



            <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar">

                {hubCoachmark.visible && (
                    <FeatureCoachmark
                        title={t('coachmark.hubTitle')}
                        body={t('coachmark.hubBody')}
                        dismissLabel={t('coachmark.dismiss')}
                        onDismiss={hubCoachmark.dismiss}
                        className="mb-4"
                    />
                )}

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



                {loading ? (

                    <DepartmentListSkeleton count={4} className="[&>div]:h-[120px]" />

                ) : (

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

                )}



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


