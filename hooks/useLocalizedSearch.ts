import { useMemo } from 'react';
import { rankLocalizedSearch } from '../utils/localizedContent';

export interface UseLocalizedSearchOptions {
    /** Max items returned when the query is non-empty. Default 50. */
    limit?: number;
    /** Minimum trimmed query length before ranking runs. Default 1. */
    minLength?: number;
}

/**
 * Rank a catalog pool by localized relevance (accents, token prefix, field weights).
 * Returns an empty array when the query is empty or shorter than `minLength`.
 * Callers keep browse / suggested / category-filter logic outside this hook.
 */
export function useLocalizedSearch<T extends Record<string, unknown>>(
    pool: T[],
    query: string,
    fields: readonly string[],
    options: UseLocalizedSearchOptions = {}
): T[] {
    const { limit = 50, minLength = 1 } = options;

    return useMemo(() => {
        const term = query.trim();
        if (!term || term.length < minLength) return [];
        return rankLocalizedSearch(pool, term, fields, limit);
    }, [pool, query, fields, limit, minLength]);
}
