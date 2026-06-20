import React, { useMemo, useState } from 'react';
import type { Destination } from '../../types/content';
import { useTranslation } from '../../hooks/useTranslation';
import { rankLocalizedSearch } from '../../utils/localizedContent';
import { DESTINATION_PICKER_SEARCH_FIELDS } from '../../utils/localizeCatalog';

const MIN_QUERY_LEN = 2;
const MAX_RESULTS = 8;

interface ExpeditionMustVisitPickerProps {
    destinations: Destination[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

export const ExpeditionMustVisitPicker: React.FC<ExpeditionMustVisitPickerProps> = ({
    destinations,
    selectedIds,
    onChange,
}) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');

    const selected = useMemo(
        () => destinations.filter((d) => selectedIds.includes(d.id)),
        [destinations, selectedIds]
    );

    const searchResults = useMemo(() => {
        const q = query.trim();
        if (q.length < MIN_QUERY_LEN) return [];
        return rankLocalizedSearch(
            destinations.filter((d) => !selectedIds.includes(d.id)) as Record<string, unknown>[],
            q,
            DESTINATION_PICKER_SEARCH_FIELDS,
            MAX_RESULTS
        ) as Destination[];
    }, [query, destinations, selectedIds]);

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

            {selected.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {selected.map((d) => (
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
                            <span className="text-content text-[12px] font-semibold truncate">{d.title}</span>
                            <span className="material-symbols-outlined text-content/50 text-[16px] shrink-0 hover:text-primary">
                                close
                            </span>
                        </button>
                    ))}
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
                    {searchResults.map((d) => (
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
                                    {d.location && (
                                        <p className="text-content/50 text-[10px] truncate">{d.location}</p>
                                    )}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
