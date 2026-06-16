import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Language } from '../../types/core';
import { useDepartment } from '../../hooks/useFirestore';
import { useTranslation } from '../../hooks/useTranslation';
import { resolveEffectiveDepartmentId } from '../../utils/departmentIds';
import { createExpedition } from '../../hooks/useCreateExpedition';
import { ExpeditionWizard } from './ExpeditionWizard';
import { translateExpeditionError } from '../../utils/expeditionErrors';
import { isExpeditionPlannerLocked } from '../../utils/expeditionPlanner';

interface ExpeditionPlannerPageProps {
    language: Language;
    onBack: () => void;
}

export const ExpeditionPlannerPage: React.FC<ExpeditionPlannerPageProps> = ({ language, onBack }) => {
    const { departmentId } = useParams<{ departmentId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { data: department } = useDepartment(departmentId);
    const canonicalId = departmentId
        ? resolveEffectiveDepartmentId(departmentId, department)
        : departmentId || '';
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

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
                <header className="shrink-0 flex items-center gap-3 px-4 pt-safe-hero pb-3 border-b border-overlay/10">
                    <button
                        type="button"
                        onClick={onBack}
                        className="size-10 rounded-full bg-overlay/10 flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                            {t('expedition.hubTitle')}
                        </p>
                        <h1 className="font-bold text-base truncate">{department?.name || departmentId}</h1>
                    </div>
                </header>
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
            <header className="shrink-0 flex items-center gap-3 px-4 pt-safe-hero pb-3 border-b border-overlay/10">
                <button
                    type="button"
                    onClick={onBack}
                    className="size-10 rounded-full bg-overlay/10 flex items-center justify-center"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                        {t('expedition.hubTitle')}
                    </p>
                    <h1 className="font-bold text-base truncate">{department?.name || departmentId}</h1>
                </div>
                <span className="material-symbols-outlined text-primary text-[28px]">explore</span>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar flex flex-col">
                {error && (
                    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
                        {error}
                    </div>
                )}
                <ExpeditionWizard
                    departmentId={canonicalId}
                    departmentName={department?.name || departmentId}
                    language={appLanguage}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                />
            </div>
        </div>
    );
};
