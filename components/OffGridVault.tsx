import React, { useState } from 'react';
import { useOffGrid } from '../hooks/useOffGrid';
import { useDepartments } from '../hooks/useContent';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { OfflineChat } from './OfflineChat';
import { OffGridManual } from './OffGridManual';
import { useHardwareBackHandler } from '../hooks/useHardwareBackHandler';

interface OffGridVaultProps {
  language: Language;
  onMenuClick: () => void;
}

export const OffGridVault: React.FC<OffGridVaultProps> = ({ language, onMenuClick }) => {
  const { t } = useTranslation();
  const [showOfflineChat, setShowOfflineChat] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const {
    downloadedPacks,
    updateAvailable,
    downloadProgress,
    isDownloading,
    gemmaInstalled,
    installingGemma,
    gemmaProgress,
    isWifi,
    storageEstimate,
    installGemma,
    uninstallGemma,
    downloadPack,
    deletePack,
    queryOffline,
    packsMetadata
  } = useOffGrid();

  const { data: departments, loading: deptsLoading } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedDeptTest, setSelectedDeptTest] = useState('');
  const [searchError, setSearchError] = useState('');

  const hasDownloadedPacks = Object.keys(downloadedPacks).length > 0;

  useHardwareBackHandler(() => {
    if (showManual) {
      setShowManual(false);
      return true;
    }
    if (showOfflineChat) {
      setShowOfflineChat(false);
      return true;
    }
    return false;
  }, [showManual, showOfflineChat]);

  if (showManual) {
    return <OffGridManual onBack={() => setShowManual(false)} />;
  }

  if (showOfflineChat) {
    return <OfflineChat language={language} onBack={() => setShowOfflineChat(false)} />;
  }

  // Gemma download detail calculations
  const GEMMA_TOTAL_MB = 1536; // 1.5 GB in MB
  const gemmaMBDownloaded = Math.round((gemmaProgress / 100) * GEMMA_TOTAL_MB);
  const gemmaMBRemaining = GEMMA_TOTAL_MB - gemmaMBDownloaded;

  // Local storage circle parameters
  const strokeDash = 2 * Math.PI * 45; // radius is 45
  const strokeOffset = strokeDash - (storageEstimate.percentage / 100) * strokeDash;

  // Handle local query test
  const handleTestQuery = async () => {
    if (!searchTerm.trim()) {
      setSearchError(t('vault.enterSearchTerm'));
      return;
    }

    setSearchError('');
    setSearchResults([]);

    try {
      const allResults: any[] = [];
      const downloadedDepts = Object.keys(downloadedPacks);

      if (downloadedDepts.length === 0) {
        setSearchError(t('vault.downloadPackToTest'));
        return;
      }

      for (const deptId of downloadedDepts) {
        const deptObj = departments.find(d => (d.departmentId || d.id) === deptId);
        const deptName = deptObj ? deptObj.name : deptId;

        const sql = `
          SELECT 'Protocolo' as source, title, content as details FROM survival_protocols 
          WHERE title LIKE ? OR keywords LIKE ? OR content LIKE ?
          UNION ALL
          SELECT 'Destino' as source, title, description as details FROM destinations
          WHERE title LIKE ? OR description LIKE ?
          UNION ALL
          SELECT 'Refugio' as source, name as title, description as details FROM refugios
          WHERE name LIKE ? OR tagline LIKE ? OR description LIKE ? OR location LIKE ?;
        `;
        const queryParam = `%${searchTerm.trim()}%`;
        const res = await queryOffline(deptId, sql, [
          queryParam, queryParam, queryParam,
          queryParam, queryParam,
          queryParam, queryParam, queryParam, queryParam
        ]);

        const mapped = res.map((item: any) => ({
          ...item,
          deptName
        }));
        allResults.push(...mapped);
      }
      
      setSearchResults(allResults);
      if (allResults.length === 0) {
        setSearchError(t('vault.noLocalMatches'));
      }
    } catch (err: any) {
      console.error(err);
      setSearchError(t('vault.localQueryError'));
    }
  };

  return (
    <div className="bg-background-dark font-display text-content antialiased h-full w-full flex flex-col overflow-y-auto no-scrollbar relative selection:bg-primary selection:text-white">
      
      {/* Header — menú principal, título, estado de red */}
      <header className="sticky top-0 z-50 bg-background-dark/90 dark:bg-[#05111e]/90 backdrop-blur-md px-4 pb-2 pt-safe border-b border-overlay/5 shrink-0">
        <div className="flex items-center gap-3 min-h-11">
          <button
            onClick={onMenuClick}
            className="flex items-center justify-center size-10 rounded-lg text-content-muted bg-overlay/5 border border-overlay/10 hover:bg-overlay/10 transition-colors shrink-0 active:scale-95"
            aria-label="Menu"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
          <h2 className="flex-1 min-w-0 text-base sm:text-lg font-bold leading-tight tracking-tight text-content truncate">
            {t('vault.title')}
          </h2>
          <div
            className={`flex items-center gap-1.5 shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
              isWifi
                ? 'border-emerald-500/25 text-emerald-400 bg-emerald-500/10'
                : 'border-red-500/25 text-red-400 bg-red-500/10'
            }`}
            title={t('vault.networkStatusHint')}
            aria-label={`${t('vault.networkStatusHint')}: ${isWifi ? t('vault.online') : t('vault.offline')}`}
          >
            <span
              className={`size-2 rounded-full shrink-0 ${isWifi ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}
              aria-hidden
            />
            <span className="material-symbols-outlined text-[14px] leading-none">
              {isWifi ? 'cloud_done' : 'cloud_off'}
            </span>
            <span className="hidden min-[360px]:inline">{isWifi ? t('vault.online') : t('vault.offline')}</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="p-5 flex flex-col gap-6 pb-[calc(4rem+env(safe-area-inset-bottom,1.5rem))]">

        {/* MANUAL DEL VIAJERO OFFLINE - COMPACT PREMIUM BANNER */}
        <section 
          onClick={() => setShowManual(true)}
          className="relative overflow-hidden rounded-[20px] bg-surface-dark dark:bg-gradient-to-r dark:from-[#0a1f35] dark:to-[#12385c] p-3 px-4 border border-overlay/10 hover:border-emerald-500/30 shadow-md dark:shadow-black/20 transition-all duration-300 group cursor-pointer"
        >
          {/* Radial pattern background */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.5) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              {/* Compact Icon with soft glow */}
              <div className="size-9 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-300">
                <span className="material-symbols-outlined text-emerald-400 text-lg group-hover:scale-110 transition-transform duration-300">menu_book</span>
              </div>
              
              <div>
                <h3 className="text-xs sm:text-sm font-black text-content group-hover:text-emerald-400 transition-colors duration-300 flex items-center gap-2">
                  {t('vault.manualTitle')}
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider shrink-0">
                    {t('vault.guide')}
                  </span>
                </h3>
                <p className="text-[10px] text-content/50 hidden sm:block mt-0.5">
                  {t('vault.manualDesc')}
                </p>
              </div>
            </div>
            
            {/* Small Action Button */}
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500/40 transition-all duration-300 shrink-0">
              <span>{t('vault.read')}</span>
              <span className="material-symbols-outlined text-[10px] group-hover:translate-x-0.5 transition-transform duration-300">arrow_forward</span>
            </div>
          </div>
        </section>
        
        {/* TELEMETRY DASHBOARD PANEL */}
        <section className="relative overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30 flex items-center gap-5">
          {/* SVG Circular Progress */}
          <div className="relative size-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="45"
                className="stroke-overlay/5 fill-none"
                strokeWidth="5"
              />
              <circle
                cx="48"
                cy="48"
                r="45"
                className="stroke-emerald-500 fill-none transition-all duration-500"
                strokeWidth="5"
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-lg font-black text-content">{storageEstimate.percentage}%</span>
              <span className="text-[7px] text-content-subtle uppercase tracking-widest">{t('vault.space')}</span>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-content/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-emerald-500">analytics</span>
              {t('vault.storageTelemetry')}
            </h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px]">
              <div>
                <p className="text-content/40 uppercase">{t('vault.used')}</p>
                <p className="font-bold text-content text-[13px] tracking-tight">{storageEstimate.used} MB</p>
              </div>
              <div>
                <p className="text-content/40 uppercase">{t('vault.quota')}</p>
                <p className="font-bold text-content text-[13px] tracking-tight">{storageEstimate.total} MB</p>
              </div>
            </div>
            <p className="text-[10px] text-content/50 mt-3 border-t border-overlay/5 pt-2 leading-relaxed">
              {t('vault.storageNote')}
            </p>
          </div>
        </section>

        {/* DUAL MODE OVERVIEW */}
        <section className="relative overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-emerald-500/20 shadow-lg dark:shadow-black/30">
          <h3 className="text-content/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-emerald-500">offline_bolt</span>
            {t('vault.dualModeTitle')}
          </h3>
          <p className="text-xs text-content/70 leading-relaxed">
            {t('vault.dualModeDesc')}
          </p>
        </section>

        {/* MODULAR DEPARTMENT PACKS SECTION — Paso 1 */}
        <section className="relative overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30">
          <h3 className="text-content/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-emerald-500">folder_zip</span>
            {t('vault.stepPacks')} · {t('vault.departmentPacks')}
          </h3>

          {deptsLoading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="size-6 border-2 border-overlay/10 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-[10px] text-content/40">{t('vault.scanningIndex')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {departments.map((dept) => {
                const deptKey = dept.departmentId || dept.id;
                const isDownloaded = downloadedPacks[deptKey] !== undefined;
                const hasUpdate = updateAvailable[deptKey] === true;
                const downloading = isDownloading[deptKey] === true;
                const progress = downloadProgress[deptKey] || 0;
                const sizeBytes = packsMetadata[deptKey]?.sizeBytes;
                const size = isDownloaded 
                  ? (downloadedPacks[deptKey]?.size || "—")
                  : (typeof sizeBytes === 'number' && sizeBytes > 0) 
                    ? (sizeBytes / (1024 * 1024)).toFixed(1) + " MB" 
                    : null;

                return (
                  <div 
                    key={dept.id}
                    className="p-4 rounded-[22px] bg-overlay/5 dark:bg-black/20 border border-overlay/10 shadow-sm hover:bg-overlay/10 dark:hover:bg-black/30 hover:border-overlay/20 transition-all flex flex-col gap-2.5 group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-content uppercase tracking-wide group-hover:text-emerald-400 transition-colors">{dept.name}</p>
                        <p className={`text-[9px] uppercase mt-0.5 font-bold tracking-wider ${
                          isDownloaded ? 'text-emerald-400' : size ? 'text-content/40' : 'text-amber-400/70 animate-pulse'
                        }`}>
                          {isDownloaded 
                            ? t('vault.availableOffline', { size })
                            : size 
                              ? t('vault.packSize', { size })
                              : t('vault.buildingPack')}
                        </p>
                      </div>

                      {/* Badges */}
                      <div className="flex gap-2">
                        {hasUpdate && !downloading && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-400 border border-amber-900/30 text-[8px] font-black animate-pulse uppercase tracking-wider">
                            {t('vault.update')}
                          </span>
                        )}
                        {isDownloaded && !hasUpdate && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 text-[8px] font-bold">
                            OK
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {downloading && (
                      <div className="w-full">
                        <div className="w-full h-1.5 bg-overlay/5 rounded-full overflow-hidden border border-overlay/5 mb-1.5">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[9px] text-content/60">
                          <span>{t('vault.downloadingStream')}</span>
                          <span className="font-bold">{progress}%</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {!downloading && (
                      <div className="flex gap-2 justify-end mt-1">
                        {isDownloaded && (
                          <button
                            onClick={() => deletePack(deptKey, dept.name)}
                            className="px-4 py-2 bg-overlay/5 hover:bg-overlay/10 border border-overlay/10 text-content/60 hover:text-content rounded-[14px] text-[10px] font-bold uppercase transition-all active:scale-[0.98]"
                          >
                            {t('vault.delete')}
                          </button>
                        )}

                        {isDownloaded && hasUpdate && (
                          <button
                            onClick={() => downloadPack(deptKey, dept.name)}
                            disabled={!isWifi}
                            className={`px-4 py-2 border rounded-[14px] text-[10px] font-bold uppercase transition-all ${
                              isWifi 
                                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600/30 active:scale-[0.98]' 
                                : 'bg-overlay/5 text-content/30 border-overlay/5 cursor-not-allowed'
                            }`}
                          >
                            {t('vault.updateBtn')}
                          </button>
                        )}

                        {!isDownloaded && (
                          <button
                            onClick={() => downloadPack(deptKey, dept.name)}
                            disabled={!isWifi}
                            className={`px-4 py-2 border rounded-[14px] text-[10px] font-bold uppercase transition-all ${
                              isWifi 
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600/30 active:scale-[0.98]' 
                                : 'bg-overlay/5 text-content/30 border-overlay/5 cursor-not-allowed'
                            }`}
                          >
                            {t('vault.download')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* LOCAL SEARCH — Paso 2 */}
        <section className="relative overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30">
          <h3 className="text-content/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-emerald-500">search</span>
            {t('vault.stepLocalSearch')} · {t('vault.testCenter')}
          </h3>
          <p className="text-xs text-content/70 leading-relaxed mb-4">
            {t('vault.testCenterDesc')}
          </p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[9px] text-content/40 uppercase font-bold block mb-1">
                {t('vault.quickSearchLabel')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('vault.queryPlaceholder')}
                  className="flex-1 h-10 border border-overlay/10 bg-overlay/5 dark:bg-black/20 text-sm text-content rounded-[14px] px-3.5 outline-none placeholder-content-subtle focus:border-emerald-500/50 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTestQuery()}
                />
                <button
                  onClick={handleTestQuery}
                  className="px-5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-[14px] transition-all active:scale-[0.98]"
                >
                  {t('vault.search')}
                </button>
              </div>
            </div>

            {searchError && (
              <p className="text-xs font-bold text-amber-500 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                {searchError}
              </p>
            )}

            {searchResults.length > 0 && (
              <div className="mt-2 border-t border-overlay/5 pt-4">
                <p className="text-[10px] text-content/40 uppercase font-bold tracking-wider mb-3">
                  {t('vault.localResults')}
                </p>
                <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto no-scrollbar">
                  {searchResults.map((result, idx) => (
                    <div key={idx} className="p-3.5 border border-overlay/10 bg-overlay/5 dark:bg-black/20 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[6px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                            {result.source}
                          </span>
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-[6px] bg-overlay/5 text-content-secondary uppercase">
                            {result.deptName}
                          </span>
                        </div>
                        <span className="text-content font-bold text-xs">{result.title}</span>
                      </div>
                      <p className="text-content/70 leading-relaxed whitespace-pre-line text-xs">
                        {result.details}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* OFFLINE CHAT — Paso 3 */}
        <section className="relative overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30">
          <h3 className="text-content/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-emerald-500">forum</span>
            {t('vault.stepChat')} · {t('vault.offlineChatSection')}
          </h3>
          <p className="text-xs text-content/70 leading-relaxed mb-4">
            {t('vault.offlineChatSectionDesc')}
          </p>
          <button
            onClick={() => setShowOfflineChat(true)}
            disabled={!hasDownloadedPacks}
            className={`w-full h-12 font-bold text-xs uppercase tracking-wider rounded-[18px] shadow-lg transition-all flex items-center justify-center gap-2 ${
              hasDownloadedPacks
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/20 active:scale-[0.98]'
                : 'bg-overlay/5 text-content/30 border border-overlay/5 cursor-not-allowed shadow-none'
            }`}
          >
            <span className="material-symbols-outlined text-sm">explore</span>
            {t('vault.openOfflineChat')}
          </button>
          {!hasDownloadedPacks && (
            <p className="text-[10px] text-amber-400/90 mt-3 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">info</span>
              {t('vault.chatRequiresPack')}
            </p>
          )}
          {hasDownloadedPacks && !gemmaInstalled && !installingGemma && (
            <p className="text-[10px] text-content/50 mt-3 leading-relaxed border-t border-overlay/5 pt-3">
              {t('vault.chatWithoutGemmaHint')}
            </p>
          )}
        </section>

        {/* GEMMA 4 — Paso 4 (opcional) */}
        <section className="relative overflow-hidden rounded-[30px] bg-surface-dark dark:bg-gradient-to-br dark:from-[#0a1f35] dark:to-[#12385c] p-6 border border-overlay/10 shadow-lg dark:shadow-black/30">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-content/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-emerald-500">memory</span>
                {t('vault.stepGemma')} · {t('vault.localBrain')}
              </h3>
              <p className="text-sm font-black text-content">
                {t('vault.smartGuide')}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold tracking-widest ${
              gemmaInstalled
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                : installingGemma
                  ? 'bg-yellow-950/60 text-yellow-400 border border-yellow-800/40 animate-pulse'
                  : 'bg-overlay/10 text-content/50 border border-overlay/20'
            }`}>
              {gemmaInstalled
                ? t('vault.gemmaInstalledBadge')
                : installingGemma
                  ? `${gemmaProgress}%`
                  : t('vault.gemmaOptionalBadge')}
            </span>
          </div>

          <p className="text-xs text-content/70 leading-relaxed mb-5">
            {t('vault.gemmaDesc')}
          </p>

          <div className="flex items-center gap-3">
            {!gemmaInstalled && !installingGemma && (
              <button
                onClick={installGemma}
                disabled={!isWifi}
                className={`w-full h-12 font-bold text-xs uppercase tracking-wider rounded-[18px] shadow-lg transition-all ${
                  isWifi
                    ? 'bg-overlay/10 hover:bg-overlay/15 text-content border border-emerald-600/40 active:scale-[0.98]'
                    : 'bg-overlay/5 text-content/30 border border-overlay/5 cursor-not-allowed shadow-none'
                }`}
              >
                {t('vault.installGemma')}
              </button>
            )}

            {installingGemma && (
              <div className="flex-1">
                <div className="w-full h-2.5 bg-overlay/5 rounded-full overflow-hidden border border-overlay/5 mb-2.5 relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300 rounded-full relative"
                    style={{ width: `${gemmaProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse rounded-full"></div>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-content/60 mb-1">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-emerald-400 animate-pulse">downloading</span>
                    {t('vault.downloadingEngine')}
                  </span>
                  <span className="font-black text-emerald-400">{gemmaProgress}%</span>
                </div>
                <div className="flex justify-between text-[9px] text-content/40">
                  <span>{gemmaMBDownloaded} MB / {GEMMA_TOTAL_MB} MB</span>
                  <span>{t('vault.mbRemaining', { n: gemmaMBRemaining })}</span>
                </div>
              </div>
            )}

            {gemmaInstalled && (
              <button
                onClick={uninstallGemma}
                className="w-full h-12 border border-red-900/40 text-red-400 hover:bg-red-950/30 hover:border-red-700 rounded-[18px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                title={t('vault.freeSpaceTitle')}
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {t('vault.free')}
                </span>
              </button>
            )}
          </div>
        </section>

      </main>
    </div>
  );
};
