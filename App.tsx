import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { requestNotificationPermission } from './services/firebaseMessaging';
import {
  createTrip,
  createGroupTrip,
  useActiveTrip,
  addExpenseToTrip,
  deleteExpenseFromTrip,
  finishTrip,
  usePastTrips,
  useUserProfile,
  updateUserProfile,
  deleteTrip,
} from './hooks/useFirestore';
import { useTripSync } from './hooks/useTripSync';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useServerReachability } from './hooks/useServerReachability';
import {
  cacheTripMirror,
  getActiveTripIdLocal,
  getTripMirror,
  makeTempId,
} from './services/tripLedgerStore';
import { TRIP_HISTORY_FULL, TRIP_LEDGER_LIMITS } from './config/constants';

import { AuthProvider, useAuth } from './components/layout/AuthProvider';
import { RevenueCatProvider } from './components/layout/RevenueCatProvider';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppRoutes } from './components/layout/AppRoutes';

import { useCapacitorHardware } from './hooks/useCapacitorHardware';
import { useEnvironmentalShieldLifecycle } from './hooks/useEnvironmentalShieldLifecycle';
import { useTranslation } from './hooks/useTranslation';

import { Expense, Trip, TripCurrency } from './types/trips';

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const { currentLanguage, languageChosen, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isOnline = useNetworkStatus();
  const serverReachable = useServerReachability(isOnline);

  useCapacitorHardware(user, menuOpen, setMenuOpen);
  useEnvironmentalShieldLifecycle(user?.uid);

  const { trip: firestoreActiveTrip } = useActiveTrip(user?.uid, isOnline);
  const { trips: pastTrips } = usePastTrips(user?.uid);
  const { data: userProfile } = useUserProfile(user?.uid);

  const [localActiveTrip, setLocalActiveTrip] = useState<Trip | null>(null);

  const {
    pendingCount,
    syncing,
    queueCreateTrip,
    queueAddExpense,
    queueDeleteExpense,
    queueFinishTrip,
    cacheTrip,
  } = useTripSync(user?.uid);

  useEffect(() => {
    const resolveActiveTrip = async () => {
      if (firestoreActiveTrip) {
        setLocalActiveTrip(null);
        await cacheTrip(firestoreActiveTrip);
        return;
      }
      const localId = await getActiveTripIdLocal();
      if (localId) {
        const mirror = await getTripMirror(localId);
        if (mirror?.status === 'active') {
          setLocalActiveTrip(mirror);
        }
      } else {
        setLocalActiveTrip(null);
      }
    };
    resolveActiveTrip();
  }, [firestoreActiveTrip, cacheTrip, isOnline]);

  const activeTrip = firestoreActiveTrip || localActiveTrip;

  useEffect(() => {
    if (user) {
      requestNotificationPermission(user.uid);
    }
  }, [user]);

  useEffect(() => {
    if (user && location.pathname === '/login') {
      navigate('/home');
    }
  }, [user, location.pathname, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const displayName =
    userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || t('trips.traveler');

  const handleCreateTripData = async (
    name: string,
    destination: string,
    options: { isGroup: boolean; defaultCurrency: TripCurrency }
  ) => {
    if (!user) return;
    try {
      if (!isOnline) {
        const localId = makeTempId('local_trip');
        const mirror: Trip = {
          id: localId,
          userId: user.uid,
          ownerId: user.uid,
          name,
          location: destination,
          status: 'active',
          type: options.isGroup ? 'group' : 'solo',
          defaultCurrency: options.defaultCurrency,
          expenses: [],
          date: new Date().toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
          totalSpent: 0,
          memberIds: [user.uid],
          members: [{ uid: user.uid, displayName, role: 'owner', joinedAt: new Date().toISOString() }],
        };
        await cacheTripMirror(mirror);
        setLocalActiveTrip(mirror);
        await queueCreateTrip(localId, {
          name,
          location: destination,
          isGroup: options.isGroup,
          displayName,
          defaultCurrency: options.defaultCurrency,
        });
        navigate('/current-trip');
        return;
      }

      if (options.isGroup) {
        await createGroupTrip(user.uid, name, destination, displayName, options.defaultCurrency);
      } else {
        await createTrip(user.uid, name, destination, options.defaultCurrency);
      }
      navigate('/current-trip');
    } catch (err) {
      console.error('Error creating trip:', err);
    }
  };

  const handleAddExpense = async (expense: Expense, tempId: string) => {
    if (!activeTrip) return;
    const useQueue = !isOnline || activeTrip.id.startsWith('local_');
    try {
      if (useQueue) {
        await queueAddExpense(activeTrip.id, expense, tempId);
      } else {
        await addExpenseToTrip(activeTrip.id, expense);
      }
    } catch (err) {
      console.error('Error adding expense:', err);
    }
  };

  const handleDeleteExpense = async (expenseId: string, amount: number) => {
    if (!activeTrip) return;
    const useQueue = !isOnline || activeTrip.id.startsWith('local_');
    try {
      if (useQueue) {
        await queueDeleteExpense(activeTrip.id, expenseId, amount);
      } else {
        await deleteExpenseFromTrip(activeTrip.id, expenseId, amount);
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTrip(tripId);
    } catch (err) {
      console.error('Error deleting trip:', err);
    }
  };

  const handleFinishTrip = async (total: number) => {
    if (!activeTrip || !user?.uid) return;
    if ((pastTrips?.length ?? 0) >= TRIP_LEDGER_LIMITS.MAX_PAST_TRIPS) {
      window.alert(t('trips.historyFull'));
      return;
    }
    const useQueue = !isOnline || activeTrip.id.startsWith('local_');
    try {
      if (useQueue) {
        await queueFinishTrip(activeTrip.id, total);
        setLocalActiveTrip(null);
      } else {
        await finishTrip(activeTrip.id, total, user.uid);
      }
      navigate('/budget');
    } catch (err) {
      if (err instanceof Error && err.message === TRIP_HISTORY_FULL) {
        window.alert(t('trips.historyFull'));
        return;
      }
      console.error('Error finishing trip:', err);
    }
  };

  if (loading)
    return (
      <div className="h-screen w-full bg-background-dark text-white flex items-center justify-center font-display font-medium">
        {t('common.loading')}
      </div>
    );

  return (
    <AppRoutes
      user={user}
      userProfile={userProfile}
      activeTrip={activeTrip}
      pastTrips={pastTrips || []}
      currentLanguage={currentLanguage}
      languageChosen={languageChosen}
      menuOpen={menuOpen}
      setMenuOpen={setMenuOpen}
      handleLogout={handleLogout}
      handleLanguageSelect={setLanguage}
      handleCreateTripData={handleCreateTripData}
      handleAddExpense={handleAddExpense}
      handleDeleteExpense={handleDeleteExpense}
      handleDeleteTrip={handleDeleteTrip}
      handleFinishTrip={handleFinishTrip}
      updateUserProfile={updateUserProfile}
      isOnline={isOnline}
      serverReachable={serverReachable}
      tripPendingCount={pendingCount}
      tripSyncing={syncing}
      displayName={displayName}
    />
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <RevenueCatProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AppContent />
          </LanguageProvider>
        </ThemeProvider>
      </RevenueCatProvider>
    </AuthProvider>
  );
};

export default App;
