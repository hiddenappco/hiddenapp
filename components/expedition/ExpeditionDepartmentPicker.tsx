import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Language } from '../../types/core';
import { useDepartments } from '../../hooks/useFirestore';
import { useTranslation } from '../../hooks/useTranslation';
import { normalizeImage } from '../../utils/imageHelpers';
import { setLastDepartmentId } from '../../utils/lastDepartment';
import { isExpeditionPlannerLocked } from '../../utils/expeditionPlanner';

interface ExpeditionDepartmentPickerProps {
    language: Language;
    onBack: () => void;
}

export const ExpeditionDepartmentPicker: React.FC<ExpeditionDepartmentPickerProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: departments, loading } = useDepartments();

    const sorted = [...(departments || [])]
        .filter((d) => d.status !== 'coming_soon')
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const pick = (dept: (typeof sorted)[0]) => {
        const id = dept.departmentId || dept.id;
        if (isExpeditionPlannerLocked(id, dept)) return;
        setLastDepartmentId(id);
        navigate(`/expedition/plan/${id}`);
    };

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
                    <h1 className="font-bold text-base">{t('expedition.pickDepartmentTitle')}</h1>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar">
                <p className="text-content/65 text-[13px] leading-relaxed mb-5">
                    {t('expedition.pickDepartmentDesc')}
                </p>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {sorted.map((dept) => {
                            const deptKey = dept.departmentId || dept.id;
                            const plannerLocked = isExpeditionPlannerLocked(deptKey, dept);
                            const hero = normalizeImage(dept.heroImage);
                            return (
                                <button
                                    key={dept.id}
                                    type="button"
                                    disabled={plannerLocked}
                                    onClick={() => pick(dept)}
                                    className={`relative w-full h-[120px] rounded-2xl overflow-hidden text-left transition-all ${
                                        plannerLocked
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
            </div>
        </div>
    );
};
