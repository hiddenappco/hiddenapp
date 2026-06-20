import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

// Layout & Infrastructure
import { Layout } from './Layout';
import { ProtectedRoute } from './ProtectedRoute';
import { PageTransition } from './PageTransition';

// Types
import { Language } from '../../types/core';
import type { Expense, TripCurrency } from '../../types/trips';

// Components — eager (hubs & auth entry)
import { LanguageSelector } from '../LanguageSelector';
import { Login } from '../Login';
import { SignUp } from '../SignUp';
import { PasswordRecovery } from '../PasswordRecovery';
import { PrivacyPolicy } from '../PrivacyPolicy';
import { TermsOfUse } from '../TermsOfUse';
import { Home } from '../Home';
import { Budget } from '../Budget';
import { SignalLostFallback } from '../SignalLostFallback';

// Lazy-loaded screens (code-split chunks)
import {
    DepartmentBriefing,
    Chat,
    ManualSearch,
    DestinationDetail,
    NewsFeed,
    NewsDetail,
    Coupons,
    CouponDetail,
    Support,
    Profile,
    Premium,
    CreateTrip,
    TripExpenses,
    TripHistoryDetail,
    JoinTrip,
    CurrencyConverter,
    SavedDestinations,
    SavedCoupons,
    SavedFairs,
    FairsCalendar,
    FairDetail,
    Notifications,
    NotificationSettings,
    ProfileSettings,
    HiddenPact,
    EnvironmentalMonitor,
    AgentSelector,
    LiveAgent,
    OffGridVault,
    Refugios,
    RefugioDetail,
    SavedRefugios,
    ExpeditionPlannerPage,
    ExpeditionResultPage,
    ExpeditionDepartmentPicker,
} from './lazyPages';

interface AppRoutesProps {
    user: any;
    userProfile: any;
    activeTrip: any;
    pastTrips: any[];
    currentLanguage: Language | null;
    languageChosen: boolean;
    menuOpen: boolean;
    setMenuOpen: (open: boolean) => void;
    handleLogout: () => Promise<void>;
    handleLanguageSelect: (lang: Language) => void;
    handleCreateTripData: (
        name: string,
        dest: string,
        options: { isGroup: boolean; defaultCurrency: TripCurrency }
    ) => Promise<void>;
    handleAddExpense: (expense: Expense, tempId: string) => Promise<void>;
    handleDeleteExpense: (id: string, amount: number) => Promise<void>;
    handleDeleteTrip: (id: string) => Promise<void>;
    handleFinishTrip: (total: number) => Promise<void>;
    updateUserProfile: (uid: string, data: any) => Promise<void>;
    isOnline: boolean;
    serverReachable: boolean;
    tripPendingCount?: number;
    tripSyncing?: boolean;
    displayName?: string;
}

interface OfflineGuardianProps {
    isOnline: boolean;
    serverReachable: boolean;
    language: Language;
    onGoToVault: () => void;
    children: React.ReactNode;
}

const OfflineGuardian: React.FC<OfflineGuardianProps> = ({
    isOnline,
    serverReachable,
    language,
    onGoToVault,
    children
}) => {
    const navigate = useNavigate();
    if (!isOnline) {
        return (
            <SignalLostFallback
                language={language}
                variant="offline"
                onGoToVault={onGoToVault}
                onGoToLedger={() => navigate('/budget')}
            />
        );
    }
    if (!serverReachable) {
        return (
            <SignalLostFallback
                language={language}
                variant="server"
                onGoToVault={onGoToVault}
                onGoToLedger={() => navigate('/budget')}
            />
        );
    }
    return <>{children}</>;
};

const TypedRoutes = Routes as React.ComponentType<any>;

export const AppRoutes: React.FC<AppRoutesProps> = ({
    user,
    userProfile,
    activeTrip,
    pastTrips,
    currentLanguage,
    languageChosen,
    menuOpen,
    setMenuOpen,
    handleLogout,
    handleLanguageSelect,
    handleCreateTripData,
    handleAddExpense,
    handleDeleteExpense,
    handleDeleteTrip,
    handleFinishTrip,
    updateUserProfile,
    isOnline,
    serverReachable,
    tripPendingCount = 0,
    tripSyncing = false,
    displayName = '',
}) => {
    const location = useLocation();
    const navigate = useNavigate();

    const commonProps = {
        language: currentLanguage || Language.Spanish,
    };

    const handleGoToVault = () => {
        navigate('/offgrid-vault');
    };

    return (
            <TypedRoutes location={location}>
                {/* --- Language Selection (Entry Point) --- */}
                <Route path="/" element={
                    !languageChosen ? (
                        <LanguageSelector
                            onSelectLanguage={handleLanguageSelect}
                            onPrivacyClick={() => navigate('/privacy')}
                        />
                    ) : (
                        <Navigate to="/home" replace />
                    )
                } />

                {/* --- Public Routes --- */}
                <Route path="/login" element={
                    <PageTransition>
                        <Login
                            {...commonProps}
                            onLoginSuccess={() => { }}
                            onTermsClick={() => navigate('/terms')}
                            onPrivacyClick={() => navigate('/privacy')}
                            onSignUpClick={() => navigate('/signup')}
                            onRecoveryClick={() => navigate('/recovery')}
                        />
                    </PageTransition>
                } />

                <Route path="/signup" element={
                    <PageTransition>
                        <SignUp
                            onLoginClick={() => navigate('/login')}
                            onSignUpSuccess={() => navigate('/pact')}
                        />
                    </PageTransition>
                } />

                <Route path="/recovery" element={
                    <PageTransition>
                        <PasswordRecovery
                            onBack={() => navigate('/login')}
                            onSubmit={() => navigate('/login')}
                        />
                    </PageTransition>
                } />

                <Route path="/privacy" element={
                    <PageTransition>
                        <PrivacyPolicy onBack={() => navigate(-1)} />
                    </PageTransition>
                } />

                <Route path="/terms" element={
                    <PageTransition>
                        <TermsOfUse onBack={() => navigate(-1)} />
                    </PageTransition>
                } />

                {/* --- Private Routes (Wrapped in Layout + ProtectedRoute) --- */}
                <Route element={
                    <ProtectedRoute isLoggedIn={!!user}>
                        <Layout
                            language={currentLanguage!}
                            isMenuOpen={menuOpen}
                            onMenuClose={() => setMenuOpen(false)}
                            onLogout={handleLogout}
                            onMenuOpen={() => setMenuOpen(true)}
                            onNavigate={(path) => {
                                setMenuOpen(false);
                                navigate(path);
                            }}
                        />
                    </ProtectedRoute>
                }>
                    <Route path="/home" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <Home
                                    {...commonProps}
                                    onExplore={(id) => navigate(`/department/${id}`)}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onSearchClick={() => navigate('/search')}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/search" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <ManualSearch
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onResultClick={(id) => navigate(`/destination/${id}`)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/department/:id" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <DepartmentBriefing
                                    {...commonProps}
                                    onBack={() => navigate('/home')}
                                    onMoreInfo={(id: string) => navigate(`/agent-select/${id}`)}
                                    onDestinationClick={(id: string) => navigate(`/destination/${id}`)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/agent-select/:contextId" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <AgentSelector
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/live/:contextId" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <LiveAgent
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/destination/:id" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <DestinationDetail
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/expedition/plan" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <ExpeditionDepartmentPicker
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/expedition/plan/:departmentId" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <ExpeditionPlannerPage
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/expedition/:expeditionId" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <ExpeditionResultPage
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/chat/:contextId" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <Chat
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/support" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <Support
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/profile" element={
                        <PageTransition>
                            <Profile
                                {...commonProps}
                                onMenuClick={() => setMenuOpen(true)}
                                onSavedClick={() => navigate('/saved')}
                                onSavedCouponsClick={() => navigate('/saved/coupons')}
                                onSavedFairsClick={() => navigate('/saved/fairs')}
                                onSavedRefugiosClick={() => navigate('/saved/refugios')}
                                onNotificationsClick={() => navigate('/notifications')}
                                onSupportClick={() => navigate('/support')}
                                onSettingsClick={() => navigate('/settings/profile')}
                                onPremiumClick={() => navigate('/premium')}
                            />
                        </PageTransition>
                    } />

                    <Route path="/calendar" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <FairsCalendar
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onFairClick={(id) => navigate(`/calendar/${id}`)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/calendar/:id" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <FairDetail {...commonProps} onBack={() => navigate(-1)} />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/news/:id" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <NewsDetail {...commonProps} onBack={() => navigate(-1)} />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/coupons/:id" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <CouponDetail {...commonProps} onBack={() => navigate(-1)} />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/notifications" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <Notifications
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                    onSettings={() => navigate('/settings/notifications')}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/settings/notifications" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <NotificationSettings {...commonProps} onBack={() => navigate(-1)} />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/settings/profile" element={
                        <PageTransition>
                            <ProfileSettings
                                {...commonProps}
                                onBack={() => navigate('/profile')}
                                onLogout={handleLogout}
                            />
                        </PageTransition>
                    } />

                    <Route path="/create-trip" element={
                        <PageTransition>
                            <CreateTrip
                                {...commonProps}
                                onBack={() => navigate('/budget')}
                                onStart={handleCreateTripData}
                            />
                        </PageTransition>
                    } />

                    <Route path="/current-trip" element={
                        activeTrip ? (
                            <PageTransition>
                                <TripExpenses
                                    {...commonProps}
                                    trip={activeTrip}
                                    userId={user?.uid}
                                    onBack={() => navigate('/budget')}
                                    onAddExpense={handleAddExpense}
                                    onDeleteExpense={handleDeleteExpense}
                                    onFinishTrip={handleFinishTrip}
                                    onOpenConverter={() => navigate('/trips/converter')}
                                    pastTripCount={pastTrips?.length ?? 0}
                                    pendingCount={tripPendingCount}
                                    syncing={tripSyncing}
                                />
                            </PageTransition>
                        ) : (
                            <Navigate to="/budget" replace />
                        )
                    } />

                    <Route path="/trips/join" element={
                        <PageTransition>
                            <JoinTrip
                                {...commonProps}
                                displayName={displayName}
                                onBack={() => navigate('/budget')}
                                onJoined={() => navigate('/current-trip')}
                            />
                        </PageTransition>
                    } />

                    <Route path="/trips/converter" element={
                        <PageTransition>
                            <CurrencyConverter
                                {...commonProps}
                                onBack={() => navigate(-1)}
                            />
                        </PageTransition>
                    } />

                    <Route path="/trip-history/:id" element={
                        <PageTransition>
                            <TripHistoryDetail
                                {...commonProps}
                                onBack={() => navigate('/budget')}
                            />
                        </PageTransition>
                    } />

                    <Route path="/news" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <NewsFeed
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onProfileClick={() => navigate('/profile')}
                                    onNewsItemClick={(news) => navigate(`/news/${news.id}`)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/coupons" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <Coupons
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onHome={() => navigate('/home')}
                                    onProfileClick={() => navigate('/profile')}
                                    onPremiumClick={() => navigate('/premium')}
                                    onCouponClick={(id) => navigate(`/coupons/${id}`)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/refugios" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <Refugios
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onRefugioClick={(id) => navigate(`/refugio/${id}`)}
                                    onPremiumClick={() => navigate('/premium')}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/refugio/:id" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <RefugioDetail
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/premium" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <Premium {...commonProps} onMenuClick={() => setMenuOpen(true)} />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/budget" element={
                        <PageTransition>
                            <Budget
                                {...commonProps}
                                activeTrip={activeTrip}
                                pastTrips={pastTrips}
                                onBack={() => navigate('/home')}
                                onMenuClick={() => setMenuOpen(true)}
                                onCreateTrip={() => navigate('/create-trip')}
                                onJoinTrip={() => navigate('/trips/join')}
                                onOpenConverter={() => navigate('/trips/converter')}
                                onOpenTrip={() => navigate('/current-trip')}
                                onOpenHistoryTrip={(t) => navigate(`/trip-history/${t.id}`)}
                                onDeleteTrip={handleDeleteTrip}
                                pendingSyncCount={tripPendingCount}
                                isOnline={isOnline}
                            />
                        </PageTransition>
                    } />

                    <Route path="/pact" element={
                        <PageTransition>
                            <HiddenPact
                                {...commonProps}
                                isAccepted={userProfile?.pactAccepted}
                                onMenuClick={() => setMenuOpen(true)}
                                onAccept={async () => {
                                    if (user) {
                                        await updateUserProfile(user.uid, { pactAccepted: true });
                                        setTimeout(() => navigate('/home'), 800);
                                    } else {
                                        navigate('/home');
                                    }
                                }}
                            />
                        </PageTransition>
                    } />

                    <Route path="/saved" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <SavedDestinations
                                    {...commonProps}
                                    onBack={() => navigate('/profile')}
                                    onHome={() => navigate('/home')}
                                    onProfile={() => navigate('/profile')}
                                    onDestinationClick={(id) => navigate(`/destination/${id}`)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/saved/refugios" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <SavedRefugios
                                    {...commonProps}
                                    onBack={() => navigate('/profile')}
                                    onHome={() => navigate('/home')}
                                    onProfile={() => navigate('/profile')}
                                    onRefugioClick={(id) => navigate(`/refugio/${id}`)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/saved/coupons" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <SavedCoupons
                                    {...commonProps}
                                    onBack={() => navigate('/profile')}
                                    onHome={() => navigate('/home')}
                                    onProfile={() => navigate('/profile')}
                                    onCouponClick={(id) => navigate(`/coupons/${id}`)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/environmental-monitor" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <EnvironmentalMonitor
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />

                    <Route path="/offgrid-vault" element={
                        <PageTransition>
                            <OffGridVault
                                {...commonProps}
                                onMenuClick={() => setMenuOpen(true)}
                            />
                        </PageTransition>
                    } />

                    <Route path="/saved/fairs" element={
                        <OfflineGuardian isOnline={isOnline} serverReachable={serverReachable} language={currentLanguage || Language.Spanish} onGoToVault={handleGoToVault}>
                            <PageTransition>
                                <SavedFairs
                                    {...commonProps}
                                    onBack={() => navigate('/profile')}
                                    onFairClick={(id) => navigate(`/calendar/${id}`)}
                                />
                            </PageTransition>
                        </OfflineGuardian>
                    } />
                </Route>
            </TypedRoutes>
    );
};
