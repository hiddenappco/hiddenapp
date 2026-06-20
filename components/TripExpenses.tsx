import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Language } from '../types/core';
import { Trip, Expense, TripCurrency, ExpenseCategory } from '../types/trips';
import { useTripExpenses, useTripActivity, canEditTrip } from '../hooks/useFirestore';
import { useTranslation } from '../hooks/useTranslation';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { EXPENSE_CATEGORY_LIST, EXPENSE_CATEGORIES_CONFIG, EXPENSE_CATEGORY_KEYS } from '../utils/tripCategories';
import { convertToCop, formatCop, formatForeign } from '../utils/currency';
import { TripSyncBanner } from './trips/TripSyncBanner';
import { TripGroupPanel } from './trips/TripGroupPanel';
import { TripBalances } from './trips/TripBalances';
import { TripActivityFeed } from './trips/TripActivityFeed';
import { CurrencyPicker } from './trips/CurrencyPicker';
import { makeTempId } from '../services/tripLedgerStore';
import { TRIP_LEDGER_LIMITS } from '../config/constants';

const MAX_PAST_TRIPS = TRIP_LEDGER_LIMITS.MAX_PAST_TRIPS;

interface TripExpensesProps {
  language: Language;
  trip: Trip;
  userId?: string;
  onBack: () => void;
  onAddExpense: (expense: Expense, tempId: string) => void;
  onDeleteExpense: (
    expenseId: string,
    amount: number,
    meta?: { note?: string; category?: ExpenseCategory }
  ) => void;
  onFinishTrip: (total: number) => void;
  onOpenConverter: () => void;
  pastTripCount?: number;
  pendingCount?: number;
  syncing?: boolean;
}

const ExpenseCard: React.FC<{
  expense: Expense;
  trip: Trip;
  onDelete: (id: string, amount: number, note?: string, category?: ExpenseCategory) => void;
  canEdit: boolean;
  getCategoryLabel: (category: ExpenseCategory) => string;
  formatCurrency: (amount: number, expense: Expense) => string;
  getMemberName: (uid: string) => string;
}> = ({ expense, trip, onDelete, canEdit, getCategoryLabel, formatCurrency, getMemberName }) => {
  const { t } = useTranslation();
  const cat = EXPENSE_CATEGORIES_CONFIG[expense.category] || EXPENSE_CATEGORIES_CONFIG.misc;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
      className="relative overflow-hidden"
    >
      {canEdit && (
        <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end px-6">
          <span className="material-symbols-outlined text-content text-2xl">delete</span>
        </div>
      )}

      <motion.div
        drag={canEdit ? 'x' : false}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (canEdit && info.offset.x < -80) {
            onDelete(expense.id, expense.amount, expense.note, expense.category);
          }
        }}
        className="relative flex items-center gap-4 p-3 bg-surface-dark border border-overlay/5 rounded-2xl shadow-sm z-10 touch-pan-x"
      >
        <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${cat.bg} ${cat.color}`}>
          <span className="material-symbols-outlined">{cat.icon}</span>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <p className="font-bold text-content text-base truncate">{expense.note}</p>
          <p className="text-xs text-content-muted font-medium">
            {getCategoryLabel(expense.category)} • {expense.time}
            {expense.pendingSync && ` • ${t('trips.activityPending')}`}
          </p>
          {expense.currency && expense.currency !== 'COP' && expense.amountOriginal != null && (
            <p className="text-[10px] text-content-subtle">
              {formatForeign(expense.amountOriginal, expense.currency)}
            </p>
          )}
          {trip.type === 'group' && expense.paidByMemberId && (
            <p className="text-[10px] text-content-subtle truncate">
              {getMemberName(expense.paidByMemberId)}
              {expense.splitAmong && expense.splitAmong.length > 0 && (
                <span>
                  {' · '}
                  {t('trips.splitAmongCount', { count: expense.splitAmong.length })}
                </span>
              )}
            </p>
          )}
        </div>
        <p className="font-extrabold text-content text-base whitespace-nowrap">
          {formatCurrency(expense.amount, expense)}
        </p>
      </motion.div>
    </motion.div>
  );
};

export const TripExpenses: React.FC<TripExpensesProps> = ({
  trip,
  userId,
  onBack,
  onAddExpense,
  onDeleteExpense,
  onFinishTrip,
  onOpenConverter,
  pastTripCount = 0,
  pendingCount = 0,
  syncing = false,
}) => {
  if (!trip) return null;

  const { t } = useTranslation();
  const isOnline = useNetworkStatus();
  const { rates } = useExchangeRates();
  const { expenses: rawExpenses } = useTripExpenses(trip.id, isOnline);
  const { activity, loading: activityLoading } = useTripActivity(
    trip.type === 'group' ? trip.id : undefined,
    isOnline
  );
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const canEdit = canEditTrip(trip, userId);
  const isOwner = trip.ownerId === userId || trip.userId === userId;

  const firestoreExpenses = rawExpenses.filter((e) => !deletedIds.includes(e.id));

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('food');
  const [inputCurrency, setInputCurrency] = useState<TripCurrency>(trip.defaultCurrency || 'COP');
  const memberList = trip.members?.length
    ? trip.members
    : (trip.memberIds || [trip.userId]).map((uid) => ({
        uid,
        displayName: t('trips.traveler'),
        role: 'owner' as const,
        joinedAt: '',
      }));
  const allMemberIds = memberList.map((m) => m.uid);
  const [paidByMemberId, setPaidByMemberId] = useState(userId || trip.userId);
  const [splitAmong, setSplitAmong] = useState<string[]>(allMemberIds);

  const getMemberName = (uid: string) =>
    memberList.find((m) => m.uid === uid)?.displayName || t('trips.traveler');

  const openAddModal = () => {
    setPaidByMemberId(userId || trip.userId);
    setSplitAmong(allMemberIds);
    setIsAddModalOpen(true);
  };

  const toggleSplitMember = (uid: string) => {
    setSplitAmong((prev) => {
      if (prev.includes(uid)) {
        const next = prev.filter((id) => id !== uid);
        return next.length ? next : prev;
      }
      return [...prev, uid];
    });
  };

  const getCategoryLabel = (category: ExpenseCategory) => t(EXPENSE_CATEGORY_KEYS[category]);

  const totalSpent = firestoreExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const formatCurrency = (amount: number, _expense?: Expense) => formatCop(amount);

  const handleSaveExpense = () => {
    if (!newAmount || !canEdit) return;
    const parsed = parseFloat(newAmount.replace(/,/g, ''));
    if (!parsed || parsed <= 0) return;

    const { amountCOP, rate, rateDate } = convertToCop(parsed, inputCurrency, rates);
    const tempId = makeTempId('temp_exp');

    const isGroup = trip.type === 'group';
    const expense: Expense = {
      id: tempId,
      category: newCategory,
      amount: amountCOP,
      amountOriginal: inputCurrency !== 'COP' ? parsed : undefined,
      currency: inputCurrency,
      exchangeRate: inputCurrency !== 'COP' ? rate : undefined,
      exchangeRateDate: inputCurrency !== 'COP' ? rateDate : undefined,
      note: newNote || getCategoryLabel(newCategory),
      time: t('trips.justNow'),
      paidByMemberId: isGroup ? paidByMemberId : userId,
      splitAmong: isGroup ? splitAmong : undefined,
      pendingSync: !isOnline,
      localOnly: !isOnline,
    };

    onAddExpense(expense, tempId);
    setIsAddModalOpen(false);
    setNewAmount('');
    setNewNote('');
  };

  const handleDelete = (expenseId: string, amount: number, note?: string, category?: ExpenseCategory) => {
    if (!canEdit) return;
    if (window.confirm(t('trips.deleteExpenseConfirm'))) {
      setDeletedIds((prev) => [...prev, expenseId]);
      onDeleteExpense(expenseId, amount, { note, category });
    }
  };

  const stats = EXPENSE_CATEGORY_LIST.map((key) => {
    const catTotal = firestoreExpenses.filter((e) => e.category === key).reduce((a, c) => a + c.amount, 0);
    const percent = totalSpent > 0 ? (catTotal / totalSpent) * 100 : 0;
    return { key, total: catTotal, percent };
  });

  return (
    <div className="bg-background-dark font-display antialiased text-content h-screen w-full flex flex-col overflow-hidden relative">

      <header className="sticky top-0 z-30 flex items-center bg-background-dark/95 backdrop-blur-md px-4 pb-2 pt-safe justify-between border-b border-overlay/5 transition-colors">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="touch-target text-content flex shrink-0 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="flex flex-col items-start max-w-[150px]">
            <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest">{t('trips.activeTripLabel')}</span>
            <h2 className="text-content text-sm font-bold leading-tight truncate w-full">{trip.name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trip.type === 'group' && userId && (
            <TripGroupPanel trip={trip} currentUid={userId} isOwner={isOwner} />
          )}
          <img src="/assets/ui/logo.png" alt="Hidden Logo" className="h-8 object-contain" />
        </div>
      </header>

      <TripSyncBanner pendingCount={pendingCount} syncing={syncing} isOnline={isOnline} />

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-6 pb-24">

        <button
          onClick={onOpenConverter}
          className="touch-target flex items-center justify-between px-4 py-3.5 rounded-2xl bg-overlay/5 border border-overlay/10 hover:border-budget-primary/30 transition-colors min-h-[3.25rem] w-full"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-budget-primary">currency_exchange</span>
            <div className="text-left">
              <p className="text-xs font-bold text-content">{t('trips.converterLink')}</p>
              {rates && (
                <p className="text-[10px] text-content-muted">
                  {t('trips.ratePreview', {
                    date: rates.trmDate || '—',
                    usd: formatCop(rates.COP_per_USD),
                  })}
                </p>
              )}
            </div>
          </div>
          <span className="material-symbols-outlined text-content-muted">chevron_right</span>
        </button>

        {!canEdit && (
          <p className="text-center text-xs text-content-muted bg-overlay/5 py-2 rounded-xl">
            {t('trips.observerMode')}
          </p>
        )}

        <div className="flex flex-col items-center justify-center py-4">
          <p className="text-content-muted font-medium text-sm mb-1">{t('trips.totalSpent')}</p>
          <h1 className="text-4xl font-extrabold text-content tracking-tight">{formatCop(totalSpent)}</h1>

          <div className="w-full max-w-xs h-3 bg-overlay/10 rounded-full mt-6 overflow-hidden flex">
            {stats.map(
              (stat) =>
                stat.percent > 0 && (
                  <div
                    key={stat.key}
                    className={`h-full ${EXPENSE_CATEGORIES_CONFIG[stat.key].barColor}`}
                    style={{ width: `${stat.percent}%` }}
                  />
                )
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {stats.map(
              (stat) =>
                stat.percent > 0 && (
                  <div key={stat.key} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${EXPENSE_CATEGORIES_CONFIG[stat.key].barColor}`} />
                    <span className="text-xs font-bold text-gray-600">{getCategoryLabel(stat.key)}</span>
                    <span className="text-xs text-content-muted">{Math.round(stat.percent)}%</span>
                  </div>
                )
            )}
          </div>
        </div>

        {trip.type === 'group' && (
          <>
            <TripBalances trip={trip} expenses={firestoreExpenses} currentUid={userId} />
            <TripActivityFeed activity={activity} loading={activityLoading} />
          </>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-content text-lg">{t('trips.transactions')}</h3>
            {canEdit && (
              <span className="text-[10px] font-bold text-budget-primary/60 uppercase tracking-tighter flex items-center gap-1 bg-budget-primary/5 px-2 py-1 rounded-lg border border-budget-primary/10">
                <span className="material-symbols-outlined text-[14px]">swipe_left</span>
                {t('trips.swipeToDelete')}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {firestoreExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  trip={trip}
                  onDelete={handleDelete}
                  canEdit={canEdit}
                  getCategoryLabel={getCategoryLabel}
                  formatCurrency={formatCurrency}
                  getMemberName={getMemberName}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {canEdit && (
          <div className="pt-4 pb-safe">
            <button
              onClick={() => {
                if (pastTripCount >= MAX_PAST_TRIPS) {
                  window.alert(t('trips.historyFull'));
                  return;
                }
                if (window.confirm(t('trips.finishConfirm'))) {
                  onFinishTrip(totalSpent);
                }
              }}
              disabled={pastTripCount >= MAX_PAST_TRIPS}
              className="w-full h-14 bg-red-50 text-red-500 font-bold rounded-xl border border-red-100 hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-45 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined">flag</span>
              {t('trips.finishTrip')}
            </button>
          </div>
        )}
      </main>

      {canEdit && (
        <div className="absolute bottom-safe right-6 z-40">
          <button
            onClick={openAddModal}
            className="flex items-center justify-center size-16 bg-budget-primary hover:bg-budget-primary-dark text-white rounded-full shadow-xl shadow-budget-primary/30 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[32px]">add</span>
          </button>
        </div>
      )}

      {isAddModalOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsAddModalOpen(false)} />
          <div className="bg-surface-dark rounded-t-[32px] p-6 pb-8 w-full animate-slide-up relative shadow-2xl border-t border-overlay/5 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-overlay/10 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold text-content mb-6 text-center">{t('trips.newExpense')}</h3>

            <div className="flex flex-col gap-6">
              <div className="flex justify-center">
                <CurrencyPicker value={inputCurrency} onChange={setInputCurrency} className="max-w-xs w-full" compact />
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="relative w-full max-w-[200px]">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-content-secondary font-bold text-3xl">
                    {inputCurrency === 'EUR' ? '€' : '$'}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0"
                    className="w-full text-center text-4xl font-extrabold text-content border-none focus:ring-0 placeholder:text-gray-700 p-0 bg-transparent"
                    autoFocus
                  />
                </div>
                {inputCurrency !== 'COP' && rates && newAmount && (
                  <p className="text-xs text-content-muted mt-2">
                    ≈ {formatCop(convertToCop(parseFloat(newAmount) || 0, inputCurrency, rates).amountCOP)}
                  </p>
                )}
              </div>

              <div className="relative">
                <label className="text-xs font-bold text-content-muted uppercase tracking-wider mb-3 block px-1">
                  {t('trips.categoryLabel')}
                </label>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
                  {EXPENSE_CATEGORY_LIST.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNewCategory(cat)}
                      className={`flex flex-col items-center gap-2 min-w-[4.5rem] min-h-[5.5rem] p-2 rounded-2xl border-2 transition-all touch-target ${
                        newCategory === cat
                          ? 'border-budget-primary bg-budget-primary/10'
                          : 'border-overlay/5 bg-overlay/5'
                      }`}
                    >
                      <div
                        className={`size-10 rounded-full flex items-center justify-center ${EXPENSE_CATEGORIES_CONFIG[cat].bg} ${EXPENSE_CATEGORIES_CONFIG[cat].color}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{EXPENSE_CATEGORIES_CONFIG[cat].icon}</span>
                      </div>
                      <span className="text-[9px] font-bold text-center leading-tight">{getCategoryLabel(cat)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-overlay/5 rounded-xl px-4 py-2 border border-overlay/10">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={t('trips.notePlaceholder')}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-content placeholder:text-content-subtle"
                />
              </div>

              {trip.type === 'group' && memberList.length > 0 && (
                <>
                  <div>
                    <label className="text-xs font-bold text-content-muted uppercase tracking-wider mb-2 block">
                      {t('trips.paidBy')}
                    </label>
                    <div className="flex flex-col gap-2">
                      {memberList.map((m) => {
                        const selected = paidByMemberId === m.uid;
                        return (
                          <button
                            key={m.uid}
                            type="button"
                            onClick={() => setPaidByMemberId(m.uid)}
                            className={`w-full min-h-[2.75rem] touch-target px-4 rounded-xl text-sm font-bold text-left transition-all border ${
                              selected
                                ? 'bg-budget-primary/15 border-budget-primary/40 text-content'
                                : 'bg-overlay/5 border-overlay/10 text-content-muted hover:border-overlay/20'
                            }`}
                          >
                            {m.displayName}
                            {m.uid === userId ? ` (${t('trips.you')})` : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-content-muted uppercase tracking-wider mb-2 block">
                      {t('trips.splitAmong')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {memberList.map((m) => {
                        const selected = splitAmong.includes(m.uid);
                        return (
                          <button
                            key={m.uid}
                            type="button"
                            onClick={() => toggleSplitMember(m.uid)}
                            className={`touch-target min-h-[2.75rem] px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                              selected
                                ? 'bg-budget-primary/15 border-budget-primary/40 text-budget-primary'
                                : 'bg-overlay/5 border-overlay/10 text-content-muted'
                            }`}
                          >
                            {m.displayName}
                          </button>
                        );
                      })}
                    </div>
                    {splitAmong.length > 0 && newAmount && (
                      <p className="text-[10px] text-content-muted mt-2 text-center">
                        {t('trips.eachPays', {
                          amount: formatCop(
                            Math.round(
                              convertToCop(parseFloat(newAmount) || 0, inputCurrency, rates).amountCOP /
                                splitAmong.length
                            )
                          ),
                        })}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="touch-target flex-1 h-14 rounded-xl font-bold text-content-subtle hover:bg-gray-100 transition-colors"
                >
                  {t('trips.cancel')}
                </button>
                <button
                  onClick={handleSaveExpense}
                  disabled={!newAmount}
                  className="touch-target flex-[2] h-14 rounded-xl bg-budget-primary text-white font-bold shadow-lg shadow-budget-primary/30 hover:bg-budget-primary-dark disabled:opacity-50 transition-all active:scale-[0.98]"
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
