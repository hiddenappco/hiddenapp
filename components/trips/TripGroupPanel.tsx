import React, { useState } from 'react';
import { Share } from '@capacitor/share';
import { useTranslation } from '../../hooks/useTranslation';
import type { Trip, TripMemberRole } from '../../types/trips';
import { updateMemberRole } from '../../hooks/useTrips';

interface TripGroupPanelProps {
    trip: Trip;
    currentUid: string;
    isOwner: boolean;
    onRoleUpdated?: () => void;
}

export const TripGroupPanel: React.FC<TripGroupPanelProps> = ({
    trip,
    currentUid,
    isOwner,
    onRoleUpdated,
}) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [updating, setUpdating] = useState<string | null>(null);

    if (trip.type !== 'group') return null;

    const handleCopyCode = async () => {
        if (!trip.tripCode) return;
        try {
            await navigator.clipboard.writeText(trip.tripCode);
        } catch {
            /* clipboard optional */
        }
    };

    const handleShare = async () => {
        if (!trip.tripCode) return;
        try {
            await Share.share({
                title: t('trips.shareGroupTitle'),
                text: t('trips.shareGroupText', { code: trip.tripCode, name: trip.name }),
                dialogTitle: t('trips.invite'),
            });
        } catch {
            /* user cancelled */
        }
    };

    const handleRoleChange = async (uid: string, role: TripMemberRole) => {
        if (!isOwner || uid === currentUid) return;
        setUpdating(uid);
        try {
            await updateMemberRole(trip.id, uid, role);
            onRoleUpdated?.();
        } finally {
            setUpdating(null);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-budget-primary/10 border border-budget-primary/20 text-budget-primary text-[10px] font-bold uppercase tracking-wider"
            >
                <span className="material-symbols-outlined text-sm">groups</span>
                {t('trips.groupTrip')}
            </button>

            {open && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
                    <div className="absolute inset-0" onClick={() => setOpen(false)} />
                    <div className="relative bg-surface-dark rounded-t-[28px] p-6 pb-safe border-t border-overlay/10 max-h-[80vh] overflow-y-auto">
                        <div className="w-12 h-1 bg-overlay/10 rounded-full mx-auto mb-5" />
                        <h3 className="text-lg font-bold text-content mb-1">{t('trips.groupPanelTitle')}</h3>
                        <p className="text-xs text-content-muted mb-5">{t('trips.groupPanelSubtitle')}</p>

                        {trip.tripCode && (
                            <div className="bg-overlay/5 border border-overlay/10 rounded-2xl p-4 mb-5">
                                <p className="text-[10px] font-bold text-content-muted uppercase tracking-widest mb-2">
                                    {t('trips.tripCodeLabel')}
                                </p>
                                <p className="text-2xl font-black text-content tracking-widest mb-3">{trip.tripCode}</p>
                                <p className="text-[10px] text-content-subtle mb-3 font-mono break-all">
                                    {t('trips.tripIdLabel')}: {trip.id}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCopyCode}
                                        className="flex-1 h-11 rounded-xl bg-overlay/10 text-content text-xs font-bold flex items-center justify-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-base">content_copy</span>
                                        {t('trips.copyCode')}
                                    </button>
                                    <button
                                        onClick={handleShare}
                                        className="flex-1 h-11 rounded-xl bg-budget-primary text-white text-xs font-bold flex items-center justify-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-base">share</span>
                                        {t('trips.invite')}
                                    </button>
                                </div>
                            </div>
                        )}

                        <h4 className="text-xs font-bold text-content-muted uppercase tracking-widest mb-3">
                            {t('trips.members')}
                        </h4>
                        <div className="flex flex-col gap-2">
                            {(trip.members || []).map((member) => (
                                <div
                                    key={member.uid}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-overlay/5 border border-overlay/5"
                                >
                                    <div className="size-10 rounded-full bg-budget-primary/20 flex items-center justify-center text-budget-primary font-bold text-sm">
                                        {member.displayName?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-content text-sm truncate">
                                            {member.displayName}
                                            {member.uid === currentUid && (
                                                <span className="text-content-muted font-medium"> ({t('trips.you')})</span>
                                            )}
                                        </p>
                                        {isOwner && member.uid !== currentUid ? (
                                            <div className="mt-1.5 flex gap-1">
                                                {(['observer', 'editor'] as const).map((role) => (
                                                    <button
                                                        key={role}
                                                        type="button"
                                                        disabled={updating === member.uid}
                                                        onClick={() => handleRoleChange(member.uid, role)}
                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${
                                                            member.role === role
                                                                ? 'bg-budget-primary/15 border-budget-primary/40 text-budget-primary'
                                                                : 'bg-overlay/5 border-overlay/10 text-content-muted hover:text-content'
                                                        }`}
                                                    >
                                                        {role === 'observer'
                                                            ? t('trips.roleObserver')
                                                            : t('trips.roleEditor')}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-content-muted uppercase font-bold">
                                                {member.role === 'owner'
                                                    ? t('trips.roleOwner')
                                                    : member.role === 'editor'
                                                      ? t('trips.roleEditor')
                                                      : t('trips.roleObserver')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
