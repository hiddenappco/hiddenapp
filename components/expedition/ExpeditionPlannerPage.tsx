import React, { useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Language } from '../../types/core';
import { useDepartment, useUserExpeditions } from '../../hooks/useFirestore';
import { useTranslation } from '../../hooks/useTranslation';
import { resolveEffectiveDepartmentId } from '../../utils/departmentIds';
import { createExpedition } from '../../hooks/useCreateExpedition';
import { ExpeditionWizard, type ExpeditionWizardHandle } from './ExpeditionWizard';
import { ExpeditionPlannerManual } from './ExpeditionPlannerManual';
import { translateExpeditionError } from '../../utils/expeditionErrors';
import { isExpeditionPlannerLocked } from '../../utils/expeditionPlanner';
import { useRevenueCat } from '../layout/RevenueCatProvider';
import { ExpeditionPremiumGate } from './ExpeditionPremiumGate';
import { computeExpeditionQuotaDisplay } from '../../utils/premiumAccess';
import { useUserProfile } from '../../hooks/useSocial';
import { useAuth } from '../layout/AuthProvider';
import { EXPEDITION_HISTORY_LIMIT } from '../../config/constants';
import { useHardwareBackHandler } from '../../hooks/useHardwareBackHandler';
import { StickyGlassHeader, StickyHeaderActionButton } from '../ui/StickyGlassHeader';

interface ExpeditionPlannerPageProps {
    language: Language;
    onBack: () => void;
}

export const ExpeditionPlannerPage: React.FC<ExpeditionPlannerPageProps> = ({ language, onBack }) => {
    const { departmentId } = useParams<{ departmentId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { isPremium } = useRevenueCat();
    const { data: profile, loading: profileLoading } = useUserProfile(user?.uid);
    const { data: department } = useDepartment(departmentId);
    const { data: savedPlans } = useUserExpeditions(user?.uid);
    const historyFull = savedPlans.length >= EXPEDITION_HISTORY_LIMIT;
    const canonicalId = departmentId
        ? resolveEffectiveDepartmentId(departmentId, department)
        : departmentId || '';
    const [submitting, setSubmitting] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [error, setError] = useState('');
    const wizardRef = useRef<ExpeditionWizardHandle>(null);

    // The wizard has its own local step state (5 questions). Both the header's
    // back arrow and Android's hardware back button must step back locally
    // through the questions first, and only leave the planner once the wizard
    // is already on its first step — otherwise a single tap/back-press was
    // discarding all the answers and exiting straight to the department hub.
    const handleHeaderBack = useCallback(() => {
        if (wizardRef.current?.goBack()) return;
        onBack();
    }, [onBack]);

    useHardwareBackHandler(() => {
        if (showManual) {
            setShowManual(false);
            return true;
        }
        if (wizardRef.current?.goBack()) return true;
        return false;
    }, [showManual]);

    if (showManual) {
        return <ExpeditionPlannerManual onBack={() => setShowManual(false)} />;
    }

    if (!profileLoading && !isPremium) {
        return <ExpeditionPremiumGate onBack={onBack} />;
    }

    const quota = computeExpeditionQuotaDisplay(profile);
    const appLanguage = language === Language.English ? 'en' : 'es';

    const handleSubmit = async (payload: Parameters<typeof createExpedition>[0]) => {
        setSubmitting(true);
        setError('');
        try {
            const { expeditionId } = await createExpedition(payload);
            navigate(`/expedition/${expeditionId}`, { replace: true });
        } catch (e) {
            const raw = String((e as Error).message || e);
            setError(translateExpeditionError(t, raw));
            setSubmitting(false);
        }
    };

    if (!departmentId) {
        return (
            <div className="h-screen flex items-center justify-center bg-background-dark text-content">
                {t('expedition.missingDept')}
            </div>
        );
    }

    const plannerLocked = isExpeditionPlannerLocked(departmentId, department);

    if (plannerLocked) {
        return (
            <div className="flex flex-col h-screen bg-background-dark text-content overflow-hidden">
                <StickyGlassHeader
                    onBack={onBack}
                    showLogo={false}
                    center={
                        <div className="text-left min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                                {t('expedition.hubTitle')}
                            </p>
                            <h1 className="font-bold text-base truncate">{department?.name || departmentId}</h1>
                        </div>
                    }
                />
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
                    <div className="glass-surface rounded-2xl p-8 max-w-sm w-full flex flex-col items-center gap-4">
                        <div className="size-14 rounded-full bg-overlay/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-content-muted text-[32px]">lock</span>
                        </div>
                        <span className="glass-pill text-primary border-primary/30">
                            {t('expedition.plannerComingSoon')}
                        </span>
                        <h2 className="font-bold text-lg">{t('expedition.plannerLockedTitle')}</h2>
                        <p className="text-content-muted text-sm leading-relaxed">{t('expedition.plannerLockedDesc')}</p>
                        <button
                            type="button"
                            onClick={onBack}
                            className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white"
                        >
                            {t('common.back')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background-dark text-content overflow-hidden">
            <StickyGlassHeader
                onBack={handleHeaderBack}
                showLogo={false}
                center={
                    <div className="text-left min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                            {t('expedition.hubTitle')}
                        </p>
                        <h1 className="font-bold text-base truncate">{department?.name || departmentId}</h1>
                    </div>
                }
                right={
                    <StickyHeaderActionButton
                        icon="menu_book"
                        onClick={() => setShowManual(true)}
                        label={t('expedition.manualTitle')}
                    />
                }
            />

            <div className="flex-1 overflow-y-auto px-4 pt-5 pb-[calc(1.25rem+var(--safe-bottom))] no-scrollbar flex flex-col">
                {isPremium && quota.limit > 0 && (
                    <p className="text-[11px] text-content-muted mb-4 rounded-xl border border-overlay/10 bg-surface-dark px-3 py-2">
                        {t('expedition.quotaBanner')
                            .replace('{remaining}', String(quota.remaining))
                            .replace('{limit}', String(quota.limit))}
                    </p>
                )}
                {!quota.allowed && isPremium && (
                    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
                        {t('expedition.quotaExceeded')}
                    </div>
                )}
                {historyFull && (
                    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
                        {t('expedition.historyFullBlock').replace('{limit}', String(EXPEDITION_HISTORY_LIMIT))}
                    </div>
                )}
                {error && (
                    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
                        {error}
                    </div>
                )}
                <ExpeditionWizard
                    ref={wizardRef}
                    departmentId={canonicalId}
                    departmentName={department?.name || departmentId}
                    language={appLanguage}
                    onSubmit={handleSubmit}
                    submitting={submitting || !quota.allowed || historyFull}
                />
            </div>
        </div>
    );
};
