import React, { useState } from 'react';
import type { ResolvedPackingGuide } from '../../types/content';
import { useTranslation } from '../../hooks/useTranslation';

interface DestinationPackingProps {
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

export const DestinationPacking: React.FC<DestinationPackingProps> = ({ packingGuide }) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState<Record<number, boolean>>(() =>
        Object.fromEntries(packingGuide.categories.map((_, idx) => [idx, idx === 0]))
    );

    const toggleCategory = (idx: number) => {
        setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
    };

    if (packingGuide.categories.length === 0 && !packingGuide.summary) return null;

    return (
        <div className="px-5 mt-6">
            <div className="bg-surface-dark border border-overlay/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary text-[24px] shrink-0">backpack</span>
                    <div className="min-w-0">
                        <h3 className="font-bold text-xl text-content leading-tight">
                            {t('destination.packing.title')}
                        </h3>
                        <p className="text-content-muted text-xs mt-0.5">
                            {t('destination.packing.subtitle')}
                        </p>
                    </div>
                </div>

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
                                    <div className="px-4 pb-3 flex flex-col gap-2">
                                        {category.items.map((item, itemIdx) => {
                                            const styles = priorityStyles(item.prioridad);
                                            return (
                                                <div
                                                    key={`${item.nombre}-${itemIdx}`}
                                                    className="rounded-lg bg-surface-dark/80 border border-overlay/5 px-3 py-2.5"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span
                                                            className={`mt-1.5 size-2 rounded-full shrink-0 ${styles.dot}`}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                                <p className="text-sm font-bold text-content leading-snug">
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
                                                </div>
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
