import React from 'react';
import { Language } from '../types/core';
import { useParams } from 'react-router-dom';
import { useTrip, useTripExpenses } from '../hooks/useFirestore';
import { useAuth } from './layout/AuthProvider';
import { exportTripToPdf } from '../services/pdfExportService';
import { useState } from 'react';
import { Share } from '@capacitor/share';
import { Browser } from '@capacitor/browser';
import { useTranslation } from '../hooks/useTranslation';

interface TripHistoryDetailProps {
  language: Language;
  onBack: () => void;
}

export const TripHistoryDetail: React.FC<TripHistoryDetailProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { trip, loading: loadingTrip } = useTrip(id);
  const { expenses: firestoreExpenses } = useTripExpenses(id);
  const [isExporting, setIsExporting] = useState(false);

  if (loadingTrip) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content">{t('common.loading')}</div>;
  if (!trip) return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-content">{t('trips.tripNotFound')}</div>;

  const categoryKeys = {
    food: 'trips.categoryFood',
    transport: 'trips.categoryTransport',
    lodging: 'trips.categoryLodging',
    tours: 'trips.categoryTours',
    misc: 'trips.categoryMisc'
  } as const;

  const getCategoryLabel = (category: keyof typeof categoryKeys) => t(categoryKeys[category]);

  const categoriesConfig = {
    food: { icon: 'restaurant', color: 'text-orange-400', barColor: 'bg-orange-500', bg: 'bg-orange-500/10' },
    transport: { icon: 'directions_bus', color: 'text-blue-400', barColor: 'bg-blue-500', bg: 'bg-blue-500/10' },
    lodging: { icon: 'hotel', color: 'text-indigo-400', barColor: 'bg-indigo-500', bg: 'bg-indigo-500/10' },
    tours: { icon: 'hiking', color: 'text-green-400', barColor: 'bg-green-500', bg: 'bg-green-500/10' },
    misc: { icon: 'receipt_long', color: 'text-content-muted', barColor: 'bg-gray-500', bg: 'bg-gray-500/10' }
  };

  const totalSpent = firestoreExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  };

  // Calculate stats for breakdown
  const stats = Object.keys(categoriesConfig).map(catKey => {
    const key = catKey as keyof typeof categoriesConfig;
    const catTotal = firestoreExpenses.filter(e => e.category === key).reduce((a, c) => a + c.amount, 0);
    const percent = totalSpent > 0 ? (catTotal / totalSpent) * 100 : 0;
    return { key, total: catTotal, percent };
  });

  const isPdfValid = () => {
    if (!trip.pdfUrl || !trip.pdfExpiresAt) return false;
    const expiresAt = trip.pdfExpiresAt?.toDate ? trip.pdfExpiresAt.toDate() : new Date(trip.pdfExpiresAt);
    return expiresAt > new Date();
  };

  const hasValidPdf = isPdfValid();

  const handleExport = async () => {
    if (!id || !user || isExporting) return;
    setIsExporting(true);
    try {
        await exportTripToPdf(id, user.uid, trip.name);
        // We do not set the trip explicitly because useTrip hook listens to real-time updates!
        // It will re-render automatically once the Cloud Function updates the document.
    } catch (error) {
        alert(t('trips.exportError'));
    } finally {
        setIsExporting(false);
    }
  };

  const handleShare = async () => {
      if (!trip.pdfUrl) return;
      try {
          await Share.share({
              title: t('trips.shareTitle'),
              text: t('trips.shareText', { name: trip.name }),
              url: trip.pdfUrl,
              dialogTitle: t('trips.shareDialog'),
          });
      } catch (e) {
          console.error("Error sharing", e);
      }
  };

  const handleDownload = async () => {
      if (!trip.pdfUrl) return;
      try {
          await Browser.open({ url: trip.pdfUrl });
      } catch (e) {
          console.error("Error opening browser", e);
      }
  };

  return (
    <div className="bg-background-dark font-display antialiased text-content h-screen w-full flex flex-col overflow-hidden relative">

      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center bg-background-dark/95 backdrop-blur-md px-4 pb-2 pt-safe justify-between border-b border-overlay/5 transition-colors">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-content flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="flex flex-col items-start max-w-[150px]">
            <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest">{t('trips.tripCompleted')}</span>
            <h2 className="text-content text-sm font-bold leading-tight truncate w-full">
              {trip.name}
            </h2>
          </div>
        </div>
        <img src="/assets/ui/logo.png" alt="Hidden Logo" className="h-8 object-contain" />
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-6 pb-24">

        {/* Total Hero */}
        <div className="flex flex-col items-center justify-center py-6">
          <p className="text-content-muted font-medium text-sm mb-1">{t('trips.totalSpent')}</p>
          <h1 className="text-4xl font-extrabold text-content tracking-tight">{formatCurrency(totalSpent)}</h1>

          {/* Visual Breakdown Bar */}
          <div className="w-full max-w-xs h-3 bg-overlay/10 rounded-full mt-6 overflow-hidden flex">
            {stats.map(stat => (
              stat.percent > 0 && (
                <div
                  key={stat.key}
                  className={`h-full ${categoriesConfig[stat.key as keyof typeof categoriesConfig].barColor}`}
                  style={{ width: `${stat.percent}%` }}
                ></div>
              )
            ))}
          </div>

          {/* Breakdown Legend */}
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {stats.map(stat => (
              stat.percent > 0 && (
                <div key={stat.key} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${categoriesConfig[stat.key as keyof typeof categoriesConfig].barColor}`}></div>
                  <span className="text-xs font-bold text-gray-600">{getCategoryLabel(stat.key as keyof typeof categoryKeys)}</span>
                  <span className="text-xs text-content-muted">{Math.round(stat.percent)}%</span>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-content text-lg tracking-tight">{t('trips.expenseSummary')}</h3>
          </div>

          {firestoreExpenses.length > 0 ? (
            firestoreExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-4 p-4 bg-overlay/5 border border-overlay/5 rounded-[22px] shadow-sm transition-all hover:bg-white/[0.07] hover:border-overlay/10 group">
                <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 border border-overlay/5 ${categoriesConfig[expense.category as keyof typeof categoriesConfig].bg} ${categoriesConfig[expense.category as keyof typeof categoriesConfig].color}`}>
                  <span className="material-symbols-outlined text-[22px]">{categoriesConfig[expense.category as keyof typeof categoriesConfig].icon}</span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <p className="font-bold text-content text-base truncate pr-2 group-hover:text-budget-primary transition-colors">{expense.note}</p>
                  <p className="text-[11px] text-content/20 font-bold uppercase tracking-wide mt-0.5">{getCategoryLabel(expense.category as keyof typeof categoryKeys)} • {expense.time || expense.date}</p>
                </div>
                <p className="font-black text-content text-base whitespace-nowrap tracking-tight">{formatCurrency(expense.amount)}</p>
              </div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-20">
              <span className="material-symbols-outlined text-4xl mb-2">sticky_note_2</span>
              <p className="text-xs font-bold uppercase tracking-widest">{t('trips.noMovements')}</p>
            </div>
          )}
        </div>

        {/* Export Button Section */}
        <div className="mt-8 mb-10 px-8">
            {!hasValidPdf ? (
                <button 
                    onClick={handleExport} 
                    disabled={isExporting}
                    className={`w-full group relative flex items-center justify-center gap-3 py-3 px-6 rounded-xl transition-all duration-300 border ${
                        isExporting 
                        ? 'bg-overlay/5 border-overlay/5 cursor-not-allowed' 
                        : 'bg-white/[0.03] border-budget-primary/40 hover:bg-budget-primary hover:border-budget-primary hover:shadow-[0_0_20px_rgba(255,108,82,0.2)] active:scale-[0.98]'
                    }`}
                >
                    <div className="relative flex items-center gap-2">
                        {isExporting ? (
                            <span className="material-symbols-outlined animate-spin text-[20px] text-content/50">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined text-[20px] text-budget-primary group-hover:text-content transition-colors">picture_as_pdf</span>
                        )}
                        <span className={`text-[11px] font-black uppercase tracking-[1.5px] transition-colors ${
                            isExporting ? 'text-content/50' : 'text-budget-primary group-hover:text-content'
                        }`}>
                            {isExporting 
                                ? t('trips.generating') 
                                : t('trips.generateSummary')
                            }
                        </span>
                    </div>
                </button>
            ) : (
                <div className="flex gap-3">
                    <button 
                        onClick={handleShare} 
                        className="flex-1 group relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 bg-overlay/10 hover:bg-overlay/20 active:scale-[0.98] border border-overlay/10"
                    >
                        <span className="material-symbols-outlined text-[20px] text-content">share</span>
                        <span className="text-[11px] font-black uppercase tracking-[1px] text-content">
                            {t('trips.share')}
                        </span>
                    </button>
                    <button 
                        onClick={handleDownload} 
                        className="flex-1 group relative flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 bg-budget-primary hover:bg-budget-primary/90 active:scale-[0.98] shadow-[0_0_15px_rgba(255,108,82,0.3)]"
                    >
                        <span className="material-symbols-outlined text-[20px] text-content">download</span>
                        <span className="text-[11px] font-black uppercase tracking-[1px] text-content">
                            {t('trips.download')}
                        </span>
                    </button>
                </div>
            )}
            <p className="text-center text-[9px] text-content/10 font-bold uppercase tracking-[1px] mt-4">
                {t('trips.certifiedLog')}
            </p>
            {hasValidPdf && (
                <p className="text-center text-[8px] text-content/20 font-medium uppercase mt-1">
                    {t('trips.linkExpires')}
                </p>
            )}
        </div>
      </main>
    </div>
  );
};