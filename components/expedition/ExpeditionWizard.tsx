import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from '../../hooks/useTranslation';
import { useDestinations } from '../../hooks/useFirestore';
import type {
    BudgetMode,
    CreateExpeditionPayload,
    ExpeditionPace,
    GroundMobility,
    TravelerProfile,
} from '../../hooks/useCreateExpedition';
import { ExpeditionMustVisitPicker } from './ExpeditionMustVisitPicker';

const INTEREST_OPTIONS = [
    'nature',
    'beach',
    'hiking',
    'gastronomy',
    'culture',
    'wildlife',
    'adventure',
    'relax',
] as const;

const MOBILITY_OPTIONS: GroundMobility[] = ['private_vehicle', 'public_transport', 'mixed'];

const STEPS = 5;

interface ExpeditionWizardProps {
    departmentId: string;
    departmentName: string;
    language: 'es' | 'en';
    onSubmit: (payload: CreateExpeditionPayload) => Promise<void>;
    submitting: boolean;
}

export const ExpeditionWizard: React.FC<ExpeditionWizardProps> = ({
    departmentId,
    departmentName,
    language,
    onSubmit,
    submitting,
}) => {
    const { t } = useTranslation();
    const { data: destinations } = useDestinations(departmentId);
    const openDestinations = useMemo(
        () => destinations.filter((d) => d.status !== false),
        [destinations]
    );

    const [step, setStep] = useState(0);
    const [days, setDays] = useState(3);
    const [originLabel, setOriginLabel] = useState('');
    const [groundMobility, setGroundMobility] = useState<GroundMobility | null>(null);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [startDate, setStartDate] = useState('');
    const [pace, setPace] = useState<ExpeditionPace>('balanced');
    const [travelerProfile, setTravelerProfile] = useState<TravelerProfile>('solo');
    const [groupSize, setGroupSize] = useState(2);
    const [interests, setInterests] = useState<string[]>(['nature']);
    const [budgetMode, setBudgetMode] = useState<BudgetMode>('open');
    const [budgetAmount, setBudgetAmount] = useState('');
    const [budgetMin, setBudgetMin] = useState('');
    const [budgetMax, setBudgetMax] = useState('');
    const [mustVisit, setMustVisit] = useState<string[]>([]);
    const [travelerNotes, setTravelerNotes] = useState('');

    useEffect(() => {
        const loadGps = async () => {
            try {
                if (Capacitor.isNativePlatform()) {
                    const perm = await Geolocation.checkPermissions();
                    if (perm.location !== 'granted') await Geolocation.requestPermissions();
                }
                const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            } catch {
                /* optional */
            }
        };
        loadGps();
    }, []);

    const endDate = useMemo(() => {
        if (!startDate || days < 1) return '';
        const d = new Date(startDate);
        d.setDate(d.getDate() + days - 1);
        return d.toISOString().slice(0, 10);
    }, [startDate, days]);

    const toggleInterest = (key: string) => {
        setInterests((prev) =>
            prev.includes(key) ? (prev.length > 1 ? prev.filter((i) => i !== key) : prev) : [...prev, key]
        );
    };

    const canNext = () => {
        if (step === 0) return days >= 1 && days <= 30 && originLabel.trim().length > 1;
        if (step === 1) return groundMobility !== null;
        if (step === 2) return interests.length > 0;
        if (step === 3) {
            if (budgetMode === 'fixed') return Number(budgetAmount) > 0;
            if (budgetMode === 'range') return Number(budgetMin) > 0 && Number(budgetMax) >= Number(budgetMin);
            return true;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!groundMobility) return;
        const payload: CreateExpeditionPayload = {
            departmentId,
            language,
            request: {
                days,
                origin: {
                    label: originLabel.trim(),
                    lat: coords?.lat ?? null,
                    lng: coords?.lng ?? null,
                },
                travelDates: startDate ? { start: startDate, end: endDate || startDate } : undefined,
                pace,
                budgetMode,
                budget:
                    budgetMode === 'fixed'
                        ? { amountCOP: Number(budgetAmount) }
                        : budgetMode === 'range'
                          ? { minCOP: Number(budgetMin), maxCOP: Number(budgetMax) }
                          : {},
                interests: interests.map((i) => t(`expedition.interest.${i}`)),
                travelerProfile,
                groupSize: travelerProfile === 'group' || travelerProfile === 'family' ? groupSize : undefined,
                mustVisitDestinationIds: mustVisit,
                groundMobility,
                travelerNotes: travelerNotes.trim() || undefined,
            },
        };
        await onSubmit(payload);
    };

    return (
        <div className="flex flex-col min-h-0 flex-1">
            <div className="px-1 mb-4">
                <div className="flex gap-1.5">
                    {Array.from({ length: STEPS }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                                i <= step ? 'bg-primary' : 'bg-overlay/15'
                            }`}
                        />
                    ))}
                </div>
                <p className="text-[10px] text-content/45 mt-2 text-center">
                    {t('expedition.wizardStep', { current: step + 1, total: STEPS })}
                </p>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25 }}
                    className="flex-1 space-y-4"
                >
                    {step === 0 && (
                        <>
                            <h2 className="text-content font-bold text-lg">{t('expedition.step1Title')}</h2>
                            <p className="text-content/60 text-[13px]">{t('expedition.step1Desc', { dept: departmentName })}</p>
                            <label className="block">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-content/50">
                                    {t('expedition.fieldDays')}
                                </span>
                                <input
                                    type="range"
                                    min={1}
                                    max={30}
                                    value={days}
                                    onChange={(e) => setDays(Number(e.target.value))}
                                    className="w-full mt-2 accent-primary"
                                />
                                <p className="text-primary font-black text-2xl text-center mt-1">{days}</p>
                            </label>
                            <label className="block">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-content/50">
                                    {t('expedition.fieldOrigin')}
                                </span>
                                <input
                                    type="text"
                                    value={originLabel}
                                    onChange={(e) => setOriginLabel(e.target.value)}
                                    placeholder={t('expedition.fieldOriginPlaceholder')}
                                    className="mt-1.5 w-full rounded-xl bg-surface-dark border border-overlay/15 px-3 py-3 text-content text-sm"
                                />
                            </label>
                            <label className="block">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-content/50">
                                    {t('expedition.fieldStartDate')}
                                </span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="mt-1.5 w-full rounded-xl bg-surface-dark border border-overlay/15 px-3 py-3 text-content text-sm"
                                />
                            </label>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <h2 className="text-content font-bold text-lg">{t('expedition.step2Title')}</h2>
                            <p className="text-content/60 text-[13px] leading-relaxed">{t('expedition.step2Desc')}</p>
                            <div className="grid grid-cols-1 gap-2.5">
                                {MOBILITY_OPTIONS.map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setGroundMobility(mode)}
                                        className={`touch-target rounded-xl border px-3 py-3.5 text-left transition-colors ${
                                            groundMobility === mode
                                                ? 'border-primary bg-primary/15 ring-1 ring-primary/30'
                                                : 'border-overlay/15'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span
                                                className={`material-symbols-outlined text-[24px] shrink-0 ${
                                                    groundMobility === mode ? 'text-primary' : 'text-content/40'
                                                }`}
                                            >
                                                {mode === 'private_vehicle'
                                                    ? 'directions_car'
                                                    : mode === 'public_transport'
                                                      ? 'directions_bus'
                                                      : 'swap_horiz'}
                                            </span>
                                            <div className="min-w-0">
                                                <p
                                                    className={`text-[13px] font-bold ${
                                                        groundMobility === mode ? 'text-primary' : 'text-content/80'
                                                    }`}
                                                >
                                                    {t(`expedition.mobility.${mode}`)}
                                                </p>
                                                <p className="text-content/50 text-[11px] mt-1 leading-snug">
                                                    {t(`expedition.mobility.${mode}Desc`)}
                                                </p>
                                            </div>
                                            {groundMobility === mode && (
                                                <span className="material-symbols-outlined text-primary text-[20px] ml-auto shrink-0">
                                                    check_circle
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {groundMobility === null && (
                                <p className="text-[11px] text-amber-400/90 text-center pt-1">
                                    {t('expedition.mobilityRequired')}
                                </p>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 className="text-content font-bold text-lg">{t('expedition.step3Title')}</h2>
                            <div className="grid grid-cols-2 gap-2">
                                {(['solo', 'couple', 'family', 'group'] as TravelerProfile[]).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setTravelerProfile(p)}
                                        className={`rounded-xl border px-3 py-3 text-left text-[12px] font-bold transition-colors ${
                                            travelerProfile === p
                                                ? 'border-primary bg-primary/15 text-primary'
                                                : 'border-overlay/15 text-content/70'
                                        }`}
                                    >
                                        {t(`expedition.profile.${p}`)}
                                    </button>
                                ))}
                            </div>
                            {(travelerProfile === 'group' || travelerProfile === 'family') && (
                                <label className="block">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-content/50">
                                        {t('expedition.fieldGroupSize')}
                                    </span>
                                    <input
                                        type="number"
                                        min={2}
                                        max={20}
                                        value={groupSize}
                                        onChange={(e) => setGroupSize(Number(e.target.value))}
                                        className="mt-1.5 w-full rounded-xl bg-surface-dark border border-overlay/15 px-3 py-3 text-content text-sm"
                                    />
                                </label>
                            )}
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-content/50">
                                    {t('expedition.fieldPace')}
                                </span>
                                <div className="flex gap-2 mt-2">
                                    {(['relaxed', 'balanced', 'intense'] as ExpeditionPace[]).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setPace(p)}
                                            className={`flex-1 rounded-lg py-2 text-[11px] font-bold border ${
                                                pace === p ? 'border-primary bg-primary/15 text-primary' : 'border-overlay/15'
                                            }`}
                                        >
                                            {t(`expedition.pace.${p}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-content/50">
                                    {t('expedition.fieldInterests')}
                                </span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {INTEREST_OPTIONS.map((key) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => toggleInterest(key)}
                                            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold border ${
                                                interests.includes(key)
                                                    ? 'border-primary bg-primary/15 text-primary'
                                                    : 'border-overlay/15 text-content/60'
                                            }`}
                                        >
                                            {t(`expedition.interest.${key}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h2 className="text-content font-bold text-lg">{t('expedition.step4Title')}</h2>
                            <div className="flex gap-2">
                                {(['open', 'fixed', 'range'] as BudgetMode[]).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setBudgetMode(m)}
                                        className={`flex-1 rounded-xl py-2.5 text-[11px] font-bold border ${
                                            budgetMode === m ? 'border-primary bg-primary/15 text-primary' : 'border-overlay/15'
                                        }`}
                                    >
                                        {t(`expedition.budgetMode.${m}`)}
                                    </button>
                                ))}
                            </div>
                            {budgetMode === 'fixed' && (
                                <input
                                    type="number"
                                    value={budgetAmount}
                                    onChange={(e) => setBudgetAmount(e.target.value)}
                                    placeholder={t('expedition.budgetAmountPlaceholder')}
                                    className="w-full rounded-xl bg-surface-dark border border-overlay/15 px-3 py-3 text-content text-sm"
                                />
                            )}
                            {budgetMode === 'range' && (
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={budgetMin}
                                        onChange={(e) => setBudgetMin(e.target.value)}
                                        placeholder={t('expedition.budgetMinPlaceholder')}
                                        className="flex-1 rounded-xl bg-surface-dark border border-overlay/15 px-3 py-3 text-content text-sm"
                                    />
                                    <input
                                        type="number"
                                        value={budgetMax}
                                        onChange={(e) => setBudgetMax(e.target.value)}
                                        placeholder={t('expedition.budgetMaxPlaceholder')}
                                        className="flex-1 rounded-xl bg-surface-dark border border-overlay/15 px-3 py-3 text-content text-sm"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <h2 className="text-content font-bold text-lg">{t('expedition.step5Title')}</h2>
                            <p className="text-content/60 text-[13px]">{t('expedition.step5Desc')}</p>
                            <label className="block">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-content/50">
                                    {t('expedition.fieldTravelerNotes')}
                                </span>
                                <textarea
                                    value={travelerNotes}
                                    onChange={(e) => setTravelerNotes(e.target.value)}
                                    placeholder={t('expedition.fieldTravelerNotesPlaceholder')}
                                    rows={4}
                                    maxLength={1200}
                                    className="mt-1.5 w-full rounded-xl bg-surface-dark border border-overlay/15 px-3 py-3 text-content text-sm resize-none leading-relaxed"
                                />
                                <p className="text-[10px] text-content/40 mt-1">{t('expedition.fieldTravelerNotesHint')}</p>
                            </label>
                            <ExpeditionMustVisitPicker
                                destinations={openDestinations}
                                selectedIds={mustVisit}
                                onChange={setMustVisit}
                            />
                        </>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="flex gap-3 pt-4 pb-safe mt-auto">
                {step > 0 && (
                    <button
                        type="button"
                        onClick={() => setStep((s) => s - 1)}
                        disabled={submitting}
                        className="touch-target flex-1 rounded-xl border border-overlay/20 py-3.5 text-content font-bold text-sm"
                    >
                        {t('common.back')}
                    </button>
                )}
                {step < STEPS - 1 ? (
                    <button
                        type="button"
                        disabled={!canNext()}
                        onClick={() => setStep((s) => s + 1)}
                        className="touch-target flex-[2] rounded-xl bg-primary py-3.5 text-white font-bold text-sm disabled:opacity-40"
                    >
                        {t('common.continue')}
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled={submitting || !canNext()}
                        onClick={handleSubmit}
                        className="touch-target flex-[2] rounded-xl bg-gradient-to-r from-primary to-[#E05D2B] py-3.5 text-white font-bold text-sm shadow-lg shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                {t('expedition.launching')}
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                                {t('expedition.launch')}
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};
