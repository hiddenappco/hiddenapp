import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLastUpdateText } from './environmentalUtils';
import { useTranslation } from '../../hooks/useTranslation';

interface EnvironmentalHeaderProps {
    isMonitoring: boolean;
    envData: any;
    onMenuClick: () => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    showResults: boolean;
    setShowResults: (show: boolean) => void;
    filteredDestinations: any[];
    setSelectedId: (id: string) => void;
    handleToggle: () => void;
    onClear: () => void;
    selectedId: string;
}

export const EnvironmentalHeader: React.FC<EnvironmentalHeaderProps> = ({
    isMonitoring,
    envData,
    onMenuClick,
    searchTerm,
    setSearchTerm,
    showResults,
    setShowResults,
    filteredDestinations,
    setSelectedId,
    handleToggle,
    onClear,
    selectedId
}) => {
    const { t, language } = useTranslation();

    return (
        <div className="sticky top-0 z-40 bg-nav-bg-dark/90 backdrop-blur-md border-b border-overlay/5 px-4 pt-safe pb-3 shrink-0">
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={onMenuClick}
                    className="flex items-center justify-center size-10 rounded-lg bg-overlay/5 border border-overlay/10 hover:bg-overlay/10 transition-colors active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px] text-content-muted">menu</span>
                </button>

                <div className="flex flex-col items-center flex-1">
                    <h1 className="text-sm font-bold tracking-[0.2em] text-content uppercase opacity-90">
                        {t('environmental.title')}
                    </h1>
                    <p className={`text-[10px] tracking-widest uppercase font-bold ${isMonitoring ? 'text-green-500' : 'text-content-subtle'}`}>
                        {isMonitoring
                            ? `${t('environmental.connected')} • ${getLastUpdateText(envData?.lastUpdate, language)}`
                            : t('environmental.standby')}
                    </p>
                </div>

                <div className="size-10 flex items-center justify-center p-1">
                    <img src="/assets/ui/logo.png" alt="Hidden Logo" className="w-full h-full object-contain opacity-80" />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-[1.6]">
                    <span className={`absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] ${isMonitoring && selectedId ? 'text-green-500' : 'text-content-subtle'}`}>
                        {isMonitoring && selectedId ? 'lock' : 'search'}
                    </span>
                    <input
                        type="text"
                        placeholder={t('environmental.searchPlaceholder')}
                        value={searchTerm}
                        readOnly={isMonitoring && !!selectedId}
                        onChange={(e) => {
                            if (isMonitoring && selectedId) return;
                            setSearchTerm(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => {
                            if (!isMonitoring || !selectedId) setShowResults(true);
                        }}
                        className={`w-full bg-overlay/5 border border-overlay/10 text-content text-sm pl-11 pr-10 py-3 rounded-lg outline-none focus:border-green-500/50 transition-colors font-bold tracking-wide placeholder:text-content-muted ${isMonitoring && selectedId ? 'cursor-default' : ''}`}
                    />

                    {searchTerm && (
                        <button
                            onClick={onClear}
                            title={
                                isMonitoring
                                    ? t('environmental.clearKeepShield')
                                    : undefined
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-content-subtle hover:text-content transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    )}

                    <AnimatePresence>
                        {showResults && (!isMonitoring || !selectedId) && searchTerm.length > 0 && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowResults(false)}
                                />

                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute left-0 right-0 top-full mt-2 bg-surface-dark border border-overlay/20 rounded-xl overflow-hidden z-50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-h-[250px] overflow-y-auto"
                                >
                                    {filteredDestinations.length > 0 ? (
                                        filteredDestinations.map(d => (
                                            <button
                                                key={d.id}
                                                onClick={() => {
                                                    setSelectedId(d.id);
                                                    setSearchTerm(d.title.split(':')[0].trim().toUpperCase());
                                                    setShowResults(false);
                                                }}
                                                className="w-full px-4 py-3 text-left hover:bg-overlay/10 active:bg-overlay/20 border-b border-overlay/5 last:border-0 transition-colors flex flex-col gap-0.5"
                                            >
                                                <span className="text-content text-[13px] font-bold tracking-wide uppercase">
                                                    {d.title.split(':')[0].trim()}
                                                </span>
                                                <span className="text-[10px] text-content-muted font-medium uppercase tracking-wider truncate opacity-80">
                                                    {d.title.split(':')[1]?.trim() || ''}
                                                </span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="px-4 py-6 text-center">
                                            <p className="text-xs text-content-subtle font-bold uppercase tracking-widest italic">
                                                {t('environmental.zoneNotFound')}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    onClick={handleToggle}
                    disabled={!isMonitoring && !selectedId}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all duration-200 overflow-hidden relative ${!isMonitoring && !selectedId ? 'opacity-30 grayscale cursor-not-allowed' :
                        isMonitoring
                            ? 'bg-green-600 border-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-105'
                            : 'bg-overlay/10 border-overlay/10 text-content-muted hover:border-primary/50 hover:text-content'
                        }`}
                >
                    <span className={`material-symbols-outlined text-[20px] transition-all duration-700 ${isMonitoring ? 'text-white' : 'text-content-subtle'}`}>
                        {isMonitoring ? 'shield' : 'security'}
                    </span>
                    <span className="text-[10px] font-black tracking-[0.15em] uppercase whitespace-nowrap">
                        {isMonitoring ? t('environmental.protected') : t('environmental.enableShield')}
                    </span>
                </button>
            </div>
        </div>
    );
};
