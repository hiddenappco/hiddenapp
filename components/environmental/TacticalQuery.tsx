import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface TacticalQueryProps {
    isMonitoring: boolean;
    loadingEnv: boolean;
    query: string;
    setQuery: (q: string) => void;
    handleQuerySubmit: (e: React.FormEvent) => Promise<void>;
}

export const TacticalQuery: React.FC<TacticalQueryProps> = ({
    isMonitoring,
    loadingEnv,
    query,
    setQuery,
    handleQuerySubmit
}) => {
    const { t } = useTranslation();

    return (
        <div className={`relative overflow-hidden rounded-xl bg-surface-dark border border-overlay/5 p-3 transition-opacity duration-500 ${!isMonitoring ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
            <form onSubmit={handleQuerySubmit} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-green-500/70">terminal</span>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={!isMonitoring || loadingEnv}
                    placeholder={t('environmental.rangerPlaceholder')}
                    className="flex-1 bg-transparent border-none outline-none text-[11px] text-content-secondary placeholder:text-content-muted font-mono tracking-wider"
                />
                <button
                    type="submit"
                    disabled={!query.trim() || !isMonitoring || loadingEnv}
                    className={`size-8 rounded-lg flex items-center justify-center transition-all ${query.trim() && isMonitoring && !loadingEnv ? 'text-green-600 dark:text-green-400 bg-green-600/10 dark:bg-green-600/20 border border-green-600/20 dark:border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-overlay/5 text-content-muted border border-overlay/5'}`}
                >
                    <span className="material-symbols-outlined text-[18px]">{loadingEnv ? 'sync' : 'send'}</span>
                </button>
            </form>

            <div className="absolute top-0 right-0 p-1 opacity-20 pointer-events-none">
                <span className="text-[6px] font-mono text-content-subtle uppercase tracking-tighter">DIRECT_LINK_ENCRYPTED</span>
            </div>
        </div>
    );
};
