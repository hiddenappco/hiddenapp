import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { requestNotificationPermission } from './services/firebaseMessaging';
import {
  createTrip,
  useActiveTrip,
  addExpenseToTrip,
  deleteExpenseFromTrip,
  finishTrip,
  usePastTrips,
  useUserProfile,
  updateUserProfile,
  deleteTrip
} from './hooks/useFirestore';

// Layout & Infrastructure
import { AuthProvider, useAuth } from './components/layout/AuthProvider';
import { RevenueCatProvider } from './components/layout/RevenueCatProvider';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppRoutes } from './components/layout/AppRoutes';

// Hooks
import { useCapacitorHardware } from './hooks/useCapacitorHardware';
import { useEnvironmentalShieldLifecycle } from './hooks/useEnvironmentalShieldLifecycle';
import { useNetworkStatus } from './hooks/useNetworkStatus';

// Types
import { Expense } from './types/trips';

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const { currentLanguage, languageChosen, setLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  // Global connectivity signal (The Route Guardian Radar).
  // Uses the native Capacitor Network plugin on device so the offline page
  // reliably triggers on Android, where navigator.onLine is unreliable.
  const isWifi = useNetworkStatus();

  // Device-specific logic (Back button, Google Auth init)
  useCapacitorHardware(user, menuOpen, setMenuOpen);
  useEnvironmentalShieldLifecycle(user?.uid);

  // -- Trip State (Real Persistence via Firestore Hooks) --
  const { trip: activeTrip } = useActiveTrip(user?.uid);
  const { trips: pastTrips } = usePastTrips(user?.uid);
  const { data: userProfile } = useUserProfile(user?.uid);

  // Request notification permission on login
  useEffect(() => {
    if (user) {
      requestNotificationPermission(user.uid);
    }
  }, [user]);

  // Handle Redirect after login
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
      console.error("Error logging out:", err);
    }
  };

  const handleCreateTripData = async (name: string, destination: string) => {
    if (!user) return;
    try {
      await createTrip(user.uid, name, destination);
      navigate('/current-trip');
    } catch (err) {
      console.error("Error creating trip:", err);
    }
  };

  const handleAddExpense = async (expense: Expense) => {
    if (activeTrip) {
      await addExpenseToTrip(activeTrip.id, expense);
    }
  };

  const handleDeleteExpense = async (expenseId: string, amount: number) => {
    if (activeTrip) {
      await deleteExpenseFromTrip(activeTrip.id, expenseId, amount);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTrip(tripId);
    } catch (err) {
      console.error("Error deleting trip:", err);
    }
  };

  const handleFinishTrip = async (total: number) => {
    if (activeTrip) {
      await finishTrip(activeTrip.id, total);
      navigate('/budget');
    }
  };

  if (loading) return <div className="h-screen w-full bg-background-dark text-white flex items-center justify-center font-display font-medium">Loading...</div>;

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
      isWifi={isWifi}
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