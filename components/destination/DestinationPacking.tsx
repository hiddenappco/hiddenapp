import React, { useMemo, useState } from 'react';
import type { ResolvedPackingGuide } from '../../types/content';
import { useTranslation } from '../../hooks/useTranslation';
import {
    packingItemKey,
    readPackingChecked,
    togglePackingItem,
} from '../../utils/packingChecklist';

interface DestinationPackingProps {
    destinationId: string;
    packingGuide: ResolvedPackingGuide;
}

function categoryIcon(categoria: string): string {
    const c = categoria.toLowerCase();
    if (c.includes('ropa') || c.includes('calzado') || c.includes('clothing') || c.includes('footwear')) {
        return 'checkroom';
    }
    if (c.includes('equipo') || c.includes('técnico') || c.includes('technical') || c.includes('gear')) {
        return 'backpack';
    }
    if (c.includes('document') || c.includes('extra')) {
        return 'description';
    }
    if (c.includes('salud') || c.includes('botiqu') || c.includes('health') || c.includes('first aid')) {
        return 'medical_services';
    }
    return 'luggage';
}

function priorityStyles(prioridad: string): { badge: string; dot: string } {
    const p = prioridad.toLowerCase();
    if (p === 'esencial' || p === 'essential') {
        return {
            badge: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
            dot: 'bg-amber-400',
        };
    }
    if (p === 'opcional' || p === 'optional') {
        return {
            badge: 'bg-overlay/10 text-content-subtle border-overlay/20',
            dot: 'bg-content-subtle',
        };
    }
    return {
        badge: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
        dot: 'bg-sky-400',
    };
}

function priorityLabel(prioridad: string, t: (key: string) => string): string {
    const p = prioridad.toLowerCase();
    if (p === 'esencial' || p === 'essential') return t('destination.packing.priorityEssential');
    if (p === 'opcional' || p === 'optional') return t('destination.packing.priorityOptional');
    return t('destination.packing.priorityRecommended');
}

export const DestinationPacking: React.FC<DestinationPackingProps> = ({
    destinationId,
    packingGuide,
}) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState<Record<number, boolean>>(() =>
        Object.fromEntries(packingGuide.categories.map((_, idx) => [idx, idx === 0]))
    );
    const [checkedKeys, setCheckedKeys] = useState<Set<string>>(() =>
        readPackingChecked(destinationId)
    );

    const totalItems = useMemo(
        () => packingGuide.categories.reduce((sum, cat) => sum + cat.items.length, 0),
        [packingGuide.categories]
    );
    const checkedCount = useMemo(() => {
        let count = 0;
        packingGuide.categories.forEach((cat, catIdx) => {
            cat.items.forEach((_item, itemIdx) => {
                if (checkedKeys.has(packingItemKey(catIdx, itemIdx))) count += 1;
            });
        });
        return count;
    }, [packingGuide.categories, checkedKeys]);

    const toggleCategory = (idx: number) => {
        setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
    };

    const handleToggleItem = (catIdx: number, itemIdx: number) => {
        const key = packingItemKey(catIdx, itemIdx);
        const isChecked = checkedKeys.has(key);
        const next = togglePackingItem(destinationId, key, !isChecked);
        setCheckedKeys(new Set(next));
    };

    if (packingGuide.categories.length === 0 && !packingGuide.summary) return null;

    return (
        <div className="px-5 mt-6">
            <div className="bg-surface-dark border border-overlay/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary text-[24px] shrink-0">backpack</span>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-xl text-content leading-tight">
                            {t('destination.packing.title')}
                        </h3>
                        <p className="text-content-muted text-xs mt-0.5">
                            {t('destination.packing.subtitle')}
                        </p>
                    </div>
                    {totalItems > 0 && (
                        <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold border border-primary/30 shrink-0">
                            {checkedCount} / {totalItems}
                        </div>
                    )}
                </div>

                {totalItems > 0 && (
                    <div className="w-full bg-overlay/10 rounded-full h-1.5 mb-4 overflow-hidden">
                        <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${(checkedCount / totalItems) * 100}%` }}
                        />
                    </div>
                )}

                {packingGuide.summary && (
                    <p className="text-content-secondary text-sm leading-relaxed mb-4 pb-4 border-b border-overlay/5">
                        {packingGuide.summary}
                    </p>
                )}

                <div className="flex flex-col gap-2">
                    {packingGuide.categories.map((category, idx) => {
                        const isOpen = expanded[idx] ?? false;
                        return (
                            <div
                                key={`${category.categoria}-${idx}`}
                                className="rounded-xl border border-overlay/5 bg-background-dark/40 overflow-hidden"
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleCategory(idx)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-overlay/5 transition-colors"
                                >
                                    <div className="bg-primary/10 p-2 rounded-full shrink-0">
                                        <span className="material-symbols-outlined text-primary text-sm">
                                            {categoryIcon(category.categoria)}
                                        </span>
                                    </div>
                                    <span className="flex-1 text-sm font-bold text-content">
                                        {category.categoria}
                                    </span>
                                    <span className="text-[10px] font-bold text-content-subtle uppercase tracking-wider shrink-0">
                                        {category.items.length}
                                    </span>
                                    <span
                                        className={`material-symbols-outlined text-content-subtle text-lg shrink-0 transition-transform ${
                                            isOpen ? 'rotate-180' : ''
                                        }`}
                                    >
                                        expand_more
                                    </span>
                                </button>

                                {isOpen && (
                                    <div className="px-3 pb-3 flex flex-col gap-2">
                                        {category.items.map((item, itemIdx) => {
                                            const styles = priorityStyles(item.prioridad);
                                            const itemKey = packingItemKey(idx, itemIdx);
                                            const isChecked = checkedKeys.has(itemKey);
                                            return (
                                                <button
                                                    key={`${item.nombre}-${itemIdx}`}
                                                    type="button"
                                                    onClick={() => handleToggleItem(idx, itemIdx)}
                                                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all active:scale-[0.99] ${
                                                        isChecked
                                                            ? 'bg-primary/10 border-primary/30'
                                                            : 'bg-surface-dark/80 border-overlay/5 hover:bg-overlay/5'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div
                                                            className={`mt-0.5 size-6 shrink-0 flex items-center justify-center rounded-full border transition-colors ${
                                                                isChecked
                                                                    ? 'bg-primary border-primary text-secondary'
                                                                    : 'border-content-subtle text-transparent'
                                                            }`}
                                                        >
                                                            <span className="material-symbols-outlined text-[16px] font-bold">
                                                                check
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                                <p
                                                                    className={`text-sm font-bold leading-snug transition-all ${
                                                                        isChecked
                                                                            ? 'text-content/70 line-through'
                                                                            : 'text-content'
                                                                    }`}
                                                                >
                                                                    {item.nombre}
                                                                </p>
                                                                <span
                                                                    className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${styles.badge}`}
                                                                >
                                                                    {priorityLabel(item.prioridad, t)}
                                                                </span>
                                                            </div>
                                                            {item.nota && (
                                                                <p className="text-xs text-content-muted leading-relaxed">
                                                                    {item.nota}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
