import React, { useMemo, useState } from 'react';
import type { Destination } from '../../types/content';
import { useTranslation } from '../../hooks/useTranslation';
import { useLocalizedSearch } from '../../hooks/useLocalizedSearch';
import { DESTINATION_PICKER_SEARCH_FIELDS } from '../../utils/localizeCatalog';
import {
    primaryFeasibilityCode,
    resolveDestinationCluster,
    type MustVisitFeasibilityResult,
} from '../../utils/expeditionFeasibility';

const MIN_QUERY_LEN = 2;
const MAX_RESULTS = 8;

interface ExpeditionMustVisitPickerProps {
    destinations: Destination[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    feasibility: MustVisitFeasibilityResult;
    onSuggestDays: (days: number) => void;
}

export const ExpeditionMustVisitPicker: React.FC<ExpeditionMustVisitPickerProps> = ({
    destinations,
    selectedIds,
    onChange,
    feasibility,
    onSuggestDays,
}) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');

    const selected = useMemo(
        () => destinations.filter((d) => selectedIds.includes(d.id)),
        [destinations, selectedIds]
    );

    const selectedClusters = useMemo(
        () => new Set(selected.map(resolveDestinationCluster).filter(Boolean)),
        [selected]
    );

    const searchPool = useMemo(
        () => destinations.filter((d) => !selectedIds.includes(d.id)) as Record<string, unknown>[],
        [destinations, selectedIds]
    );

    const rankedResults = useLocalizedSearch(searchPool, query, DESTINATION_PICKER_SEARCH_FIELDS, {
        limit: MAX_RESULTS,
        minLength: MIN_QUERY_LEN,
    });

    const searchResults = useMemo(() => {
        if (query.trim().length < MIN_QUERY_LEN) return [];

        const ranked = rankedResults as Destination[];

        if (selectedClusters.size === 0) return ranked;

        return [...ranked].sort((a, b) => {
            const aMatch = selectedClusters.has(resolveDestinationCluster(a)) ? 1 : 0;
            const bMatch = selectedClusters.has(resolveDestinationCluster(b)) ? 1 : 0;
            return bMatch - aMatch;
        });
    }, [query, rankedResults, selectedClusters]);

    const canExpandDays = useMemo(() => {
        const currentDays = feasibility.issues[0]?.currentDays ?? 0;
        return feasibility.suggestedDays > currentDays;
    }, [feasibility]);

    const feasibilityMessage = useMemo(() => {
        if (feasibility.ok || feasibility.issues.length === 0) return '';
        const issue = feasibility.issues.find((i) => i.code === primaryFeasibilityCode(feasibility.issues));
        if (!issue) return '';

        const clusterList = issue.clusterLabels.join(' · ');
        const titles = issue.destinationTitles.slice(0, 3).join(', ');
        const code = primaryFeasibilityCode(feasibility.issues);

        if (code === 'MIN_DAYS') {
            return t('expedition.feasibility.minDays', {
                titles,
                suggested: String(feasibility.suggestedDays),
            });
        }
        if (code === 'CLUSTER_SPREAD') {
            return t('expedition.feasibility.clusterSpread', {
                count: String(issue.clusterLabels.length),
                clusterList,
                current: String(issue.currentDays),
                suggested: String(feasibility.suggestedDays),
            });
        }
        return t('expedition.feasibility.distantClusters', {
            current: String(issue.currentDays),
            clusterList,
            suggested: String(feasibility.suggestedDays),
        });
    }, [feasibility, t]);

    const addDestination = (id: string) => {
        if (!selectedIds.includes(id)) onChange([...selectedIds, id]);
        setQuery('');
    };

    const removeDestination = (id: string) => {
        onChange(selectedIds.filter((x) => x !== id));
    };

    return (
        <div className="space-y-3">
            <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-content/50">
                    {t('expedition.fieldMustVisit')}
                </span>
                <p className="text-content/45 text-[11px] mt-1 leading-snug">{t('expedition.fieldMustVisitHint')}</p>
            </div>

            {!feasibility.ok && feasibilityMessage && (
                <div
                    className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-3 space-y-2.5"
                    role="alert"
                >
                    <div className="flex gap-2.5">
                        <span className="material-symbols-outlined text-amber-400 text-[20px] shrink-0 mt-0.5">
                            warning
                        </span>
                        <p className="text-[12px] text-content/85 leading-relaxed">{feasibilityMessage}</p>
                    </div>
                    {canExpandDays && (
                        <div className="flex flex-wrap gap-2 pl-8">
                            <button
                                type="button"
                                onClick={() => onSuggestDays(feasibility.suggestedDays)}
                                className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-white shadow-sm"
                            >
                                {t('expedition.feasibility.expandDays', { days: String(feasibility.suggestedDays) })}
                            </button>
                        </div>
                    )}
                    <p className="text-[10px] text-content/45 pl-8">{t('expedition.feasibility.blockedHint')}</p>
                </div>
            )}

            {selected.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {selected.map((d) => {
                        const cluster = resolveDestinationCluster(d);
                        return (
                            <button
                                key={d.id}
                                type="button"
                                onClick={() => removeDestination(d.id)}
                                className="inline-flex items-center gap-1.5 max-w-full rounded-full border border-primary/40 bg-primary/10 pl-3 pr-2 py-1.5 text-left"
                                aria-label={t('expedition.mustVisitRemove', { name: d.title })}
                            >
                                <span className="material-symbols-outlined text-primary text-[16px] shrink-0">
                                    location_on
                                </span>
                                <span className="min-w-0 flex flex-col">
                                    <span className="text-content text-[12px] font-semibold truncate">{d.title}</span>
                                    {cluster && (
                                        <span className="text-[9px] font-bold uppercase tracking-wide text-primary/70 truncate">
                                            {t('expedition.mustVisitClusterBadge', { cluster })}
                                        </span>
                                    )}
                                </span>
                                <span className="material-symbols-outlined text-content/50 text-[16px] shrink-0 hover:text-primary">
                                    close
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <p className="text-content/40 text-[11px] italic">{t('expedition.mustVisitEmpty')}</p>
            )}

            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-content/35 text-[20px]">search</span>
                </div>
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('expedition.fieldMustVisitSearch')}
                    className="w-full rounded-xl bg-surface-dark border border-overlay/15 pl-10 pr-10 py-3 text-content text-sm placeholder:text-content/35"
                    autoComplete="off"
                />
                {query.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-content/40"
                        aria-label={t('expedition.fieldMustVisitSearch')}
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                )}
            </div>

            {query.trim().length > 0 && query.trim().length < MIN_QUERY_LEN && (
                <p className="text-content/40 text-[11px]">{t('expedition.mustVisitSearchMin')}</p>
            )}

            {query.trim().length >= MIN_QUERY_LEN && searchResults.length === 0 && (
                <p className="text-content/45 text-[12px] text-center py-2">{t('expedition.mustVisitNoResults')}</p>
            )}

            {searchResults.length > 0 && (
                <ul className="rounded-xl border border-overlay/10 overflow-hidden divide-y divide-overlay/10">
                    {searchResults.map((d) => {
                        const cluster = resolveDestinationCluster(d);
                        const sameZone = cluster && selectedClusters.has(cluster);
                        return (
                            <li key={d.id}>
                                <button
                                    type="button"
                                    onClick={() => addDestination(d.id)}
                                    className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-overlay/5 active:bg-primary/10 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-primary/70 text-[20px] shrink-0">
                                        add_location
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-content text-[13px] font-bold truncate">{d.title}</p>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                            {d.location && (
                                                <p className="text-content/50 text-[10px] truncate">{d.location}</p>
                                            )}
                                            {cluster && (
                                                <span
                                                    className={`text-[9px] font-bold uppercase tracking-wide ${
                                                        sameZone ? 'text-primary' : 'text-content/40'
                                                    }`}
                                                >
                                                    {cluster}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {sameZone && (
                                        <span className="text-[9px] font-bold text-primary shrink-0">✓</span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
