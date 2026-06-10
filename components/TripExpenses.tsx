import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language } from '../types/core';
import { Trip, Expense } from '../types/trips';
import { useTripExpenses } from '../hooks/useFirestore';
import { useTranslation } from '../hooks/useTranslation';

interface TripExpensesProps {
  language: Language;
  trip: Trip;
  onBack: () => void;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string, amount: number) => void;
  onFinishTrip: (total: number) => void;
}

// Isolated ExpenseCard component to properly handle unmounting in React 19
const ExpenseCard: React.FC<{
  expense: any;
  onDelete: (id: string, amount: number) => void;
  categoriesConfig: any;
  getCategoryLabel: (category: string) => string;
  formatCurrency: (amount: number) => string;
}> = ({ expense, onDelete, categoriesConfig, getCategoryLabel, formatCurrency }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 80 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
      className="relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end px-6">
        <span className="material-symbols-outlined text-content text-2xl">delete</span>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) {
            onDelete(expense.id, expense.amount);
          }
        }}
        className="absolute inset-0 flex items-center gap-4 p-3 bg-surface-dark border border-overlay/5 rounded-2xl shadow-sm z-10 touch-pan-x"
      >
        <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${categoriesConfig[expense.category].bg} ${categoriesConfig[expense.category].color}`}>
          <span className="material-symbols-outlined">{categoriesConfig[expense.category].icon}</span>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <p className="font-bold text-content text-base truncate">{expense.note}</p>
          <p className="text-xs text-content-muted font-medium">{getCategoryLabel(expense.category)} • {expense.time}</p>
        </div>
        <p className="font-extrabold text-content text-base whitespace-nowrap">{formatCurrency(expense.amount)}</p>
      </motion.div>
    </motion.div>
  );
};

export const TripExpenses: React.FC<TripExpensesProps> = ({ trip, onBack, onAddExpense, onDeleteExpense, onFinishTrip }) => {
  if (!trip) return null;

  const { t } = useTranslation();
  const { expenses: rawExpenses, loading: loadingExpenses } = useTripExpenses(trip.id);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // Optimistic UI: Filter out IDs we know are being deleted before Firestore updates
  const firestoreExpenses = rawExpenses.filter(e => !deletedIds.includes(e.id));

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newCategory, setNewCategory] = useState<'food' | 'transport' | 'lodging' | 'tours' | 'misc'>('food');

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

  const handleSaveExpense = () => {
    if (!newAmount) return;
    const expense: Expense = {
      id: Date.now().toString(),
      category: newCategory,
      amount: parseInt(newAmount.replace(/\D/g, '')),
      note: newNote || getCategoryLabel(newCategory),
      time: t('trips.justNow')
    };
    onAddExpense(expense);
    setIsAddModalOpen(false);
    setNewAmount('');
    setNewNote('');
  };

  const handleDelete = (expenseId: string, amount: number) => {
    if (window.confirm(t('trips.deleteExpenseConfirm'))) {
      setDeletedIds(prev => [...prev, expenseId]);
      onDeleteExpense(expenseId, amount);
    }
  };

  // Calculate stats for breakdown
  const stats = Object.keys(categoriesConfig).map(catKey => {
    const key = catKey as keyof typeof categoriesConfig;
    const catTotal = firestoreExpenses.filter(e => e.category === key).reduce((a, c) => a + c.amount, 0);
    const percent = totalSpent > 0 ? (catTotal / totalSpent) * 100 : 0;
    return { key, total: catTotal, percent };
  });

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
            <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest">{t('trips.activeTripLabel')}</span>
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
            <h3 className="font-bold text-content text-lg">{t('trips.transactions')}</h3>
            <span className="text-[10px] font-bold text-budget-primary/60 uppercase tracking-tighter flex items-center gap-1 bg-budget-primary/5 px-2 py-1 rounded-lg border border-budget-primary/10">
              <span className="material-symbols-outlined text-[14px]">swipe_left</span>
              {t('trips.swipeToDelete')}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {firestoreExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onDelete={handleDelete}
                  categoriesConfig={categoriesConfig}
                  getCategoryLabel={getCategoryLabel}
                  formatCurrency={formatCurrency}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Finish Trip Button */}
        <div className="pt-4 pb-safe">
          <button
            onClick={() => {
              if (window.confirm(t('trips.finishConfirm'))) {
                onFinishTrip(totalSpent);
              }
            }}
            className="w-full h-14 bg-red-50 text-red-500 font-bold rounded-xl border border-red-100 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">flag</span>
            {t('trips.finishTrip')}
          </button>
        </div>
      </main>

      {/* Floating Add Button */}
      <div className="absolute bottom-safe right-6 z-40">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center size-16 bg-budget-primary hover:bg-budget-primary-dark text-white rounded-full shadow-xl shadow-budget-primary/30 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[32px]">add</span>
        </button>
      </div>

      {/* Add Expense Overlay Modal */}
      {isAddModalOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="absolute inset-0"
            onClick={() => setIsAddModalOpen(false)}
          ></div>
          <div className="bg-surface-dark rounded-t-[32px] p-6 pb-8 w-full animate-slide-up relative shadow-2xl border-t border-overlay/5">
            <div className="w-12 h-1.5 bg-overlay/10 rounded-full mx-auto mb-6"></div>

            <h3 className="text-xl font-bold text-content mb-6 text-center">{t('trips.newExpense')}</h3>

            <div className="flex flex-col gap-6">
              {/* Amount Input */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-full max-w-[200px]">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-content-secondary font-bold text-3xl">$</span>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0"
                    className="w-full text-center text-4xl font-extrabold text-content border-none focus:ring-0 placeholder:text-gray-700 p-0 bg-transparent"
                    autoFocus
                  />
                </div>
              </div>

              {/* Category Selector */}
              <div className="relative">
                <label className="text-xs font-bold text-content-muted uppercase tracking-wider mb-3 block px-1">{t('trips.categoryLabel')}</label>
                <div className="relative group">
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
                    {(Object.keys(categoriesConfig) as Array<keyof typeof categoriesConfig>).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setNewCategory(cat)}
                        className={`flex flex-col items-center gap-2 min-w-[85px] p-3 rounded-2xl border-2 transition-all ${newCategory === cat
                          ? `border-budget-primary bg-budget-primary/10 shadow-md shadow-budget-primary/10`
                          : 'border-overlay/5 bg-overlay/5 hover:bg-overlay/10'
                          }`}
                      >
                        <div className={`size-12 rounded-full flex items-center justify-center ${categoriesConfig[cat].bg} ${categoriesConfig[cat].color} shadow-sm`}>
                          <span className="material-symbols-outlined text-[24px]">{categoriesConfig[cat].icon}</span>
                        </div>
                        <span className={`text-[11px] font-bold tracking-tight px-1 text-center leading-tight ${newCategory === cat ? 'text-content' : 'text-content-subtle'}`}>
                          {getCategoryLabel(cat)}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Scroll Indicators */}
                  <div className="absolute right-0 top-[40px] bottom-[16px] w-12 bg-gradient-to-l from-surface-dark via-surface-dark/80 to-transparent pointer-events-none flex items-center justify-end px-1 opacity-100 animate-pulse">
                    <span className="material-symbols-outlined text-content-subtle text-sm">chevron_right</span>
                  </div>
                </div>
              </div>

              {/* Note Input */}
              <div className="bg-overlay/5 rounded-xl px-4 py-2 border border-overlay/10 focus-within:border-budget-primary/50 focus-within:bg-overlay/10 transition-colors">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={t('trips.notePlaceholder')}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-content placeholder:text-content-subtle"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 h-14 rounded-xl font-bold text-content-subtle hover:bg-gray-100 transition-colors"
                >
                  {t('trips.cancel')}
                </button>
                <button
                  onClick={handleSaveExpense}
                  disabled={!newAmount}
                  className="flex-[2] h-14 rounded-xl bg-budget-primary text-white font-bold shadow-lg shadow-budget-primary/30 hover:bg-budget-primary-dark disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
                >
                  {t('trips.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};