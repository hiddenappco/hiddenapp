import React, { useMemo } from 'react';
import type { TripActivityEntry } from '../../types/trips';
import { useTranslation } from '../../hooks/useTranslation';
import { formatCop } from '../../utils/currency';
import { EXPENSE_CATEGORY_KEYS } from '../../utils/tripCategories';
import type { ExpenseCategory } from '../../types/trips';

interface TripActivityFeedProps {
    activity: TripActivityEntry[];
    loading?: boolean;
}

function formatWhen(ts: number, locale: string): string {
    try {
        return new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(ts));
    } catch {
        return '';
    }
}

function activityIcon(kind: TripActivityEntry['kind']): string {
    switch (kind) {
        case 'expense_added':
            return 'add_circle';
        case 'expense_deleted':
            return 'remove_circle';
        case 'member_joined':
            return 'group_add';
        case 'document_added':
            return 'upload_file';
        case 'document_deleted':
            return 'scan_delete';
        default:
            return 'history';
    }
}

export const TripActivityFeed: React.FC<TripActivityFeedProps> = ({ activity, loading }) => {
    const { t, language } = useTranslation();
    const locale = language === 'en' ? 'en-US' : 'es-CO';

    const lines = useMemo(
        () =>
            activity.map((entry) => {
                const categoryLabel =
                    entry.category && entry.category in EXPENSE_CATEGORY_KEYS
                        ? t(EXPENSE_CATEGORY_KEYS[entry.category as ExpenseCategory])
                        : undefined;
                let messageKey = 'trips.activityGeneric';
                const params: Record<string, string> = {
                    name: entry.actorName,
                    uid: entry.actorUid.slice(0, 8),
                };
                if (entry.kind === 'expense_added') {
                    messageKey = 'trips.activityExpenseAdded';
                    params.amount = entry.amountCOP != null ? formatCop(entry.amountCOP) : '';
                    params.note = entry.note || categoryLabel || t('trips.activityExpenseFallback');
                } else if (entry.kind === 'expense_deleted') {
                    messageKey = 'trips.activityExpenseDeleted';
                    params.amount = entry.amountCOP != null ? formatCop(entry.amountCOP) : '';
                    params.note = entry.note || categoryLabel || t('trips.activityExpenseFallback');
                } else if (entry.kind === 'member_joined') {
                    messageKey = 'trips.activityMemberJoined';
                } else if (entry.kind === 'document_added') {
                    messageKey = 'trips.activityDocumentAdded';
                    params.doc = entry.documentName || t('trips.documentsTitle');
                } else if (entry.kind === 'document_deleted') {
                    messageKey = 'trips.activityDocumentDeleted';
                    params.doc = entry.documentName || t('trips.documentsTitle');
                }
                return {
                    id: entry.id,
                    icon: activityIcon(entry.kind),
                    text: t(messageKey, params),
                    when: formatWhen(entry.createdAt, locale),
                    pending: entry.pendingSync,
                };
            }),
        [activity, t, locale]
    );

    if (loading && lines.length === 0) {
        return (
            <section className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
                <h3 className="text-sm font-bold text-content mb-1">{t('trips.activityTitle')}</h3>
                <p className="text-xs text-content-muted animate-pulse">{t('common.loading')}</p>
            </section>
        );
    }

    if (lines.length === 0) {
        return (
            <section className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
                <h3 className="text-sm font-bold text-content mb-1">{t('trips.activityTitle')}</h3>
                <p className="text-xs text-content-muted">{t('trips.activityEmpty')}</p>
            </section>
        );
    }

    return (
        <section className="rounded-2xl border border-overlay/10 bg-overlay/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-overlay/10">
                <h3 className="text-sm font-bold text-content">{t('trips.activityTitle')}</h3>
                <p className="text-[10px] text-content-muted mt-0.5">{t('trips.activitySubtitle')}</p>
            </div>
            {/* No inner max-height/scroll: nesting a scroll region here can get its
                available height miscalculated by ancestor containers (e.g. the
                desktop "phone simulator" CSS frame in index.css), silently
                clipping the last entry. The outer page scroll already handles
                overflow when there are many entries. */}
            <ul className="divide-y divide-overlay/5">
                {lines.map((line) => (
                    <li key={line.id} className="flex items-start gap-3 px-4 py-3">
                        <span className="material-symbols-outlined text-[18px] text-budget-primary shrink-0 mt-0.5">
                            {line.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-content leading-relaxed">{line.text}</p>
                            <p className="text-[10px] text-content-muted mt-1">
                                {line.when}
                                {line.pending ? ` · ${t('trips.activityPending')}` : ''}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
};
