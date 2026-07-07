import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { ProtectedRoute } from './ProtectedRoute';
import { PactGate } from './PactGate';
import { PactGateLoading } from './PactGateLoading';
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
import { ConnectivityGuard } from './ConnectivityGuard';
import type { ConnectivityPolicy } from '../../utils/connectivityRoutePolicy';
import { PactDeclined } from '../PactDeclined';
import { useTranslation } from '../../hooks/useTranslation';

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
    TripDocumentsPage,
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
    SettingsHub,
    AppSettings,
    SettingsPremium,
    RoleSettingsPanel,
    Faq,
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
    tripReconcileHint?: boolean;
    displayName?: string;
    profileLoading?: boolean;
}

interface RouteConnectivityProps {
    isOnline: boolean;
    serverReachable: boolean;
    onGoToVault: () => void;
    onGoToOfflineHub: () => void;
}

/** Shorthand to wrap a screen with P1-OFF-03 connectivity policy. */
function withConnectivity(
    policy: ConnectivityPolicy,
    props: RouteConnectivityProps,
    children: React.ReactNode
) {
    return (
        <ConnectivityGuard policy={policy} {...props}>
            {children}
        </ConnectivityGuard>
    );
}

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
    tripReconcileHint = false,
    displayName = '',
    profileLoading = false,
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [pactDeclined, setPactDeclined] = React.useState(false);

    React.useEffect(() => {
        if (userProfile?.pactAccepted === true) {
            setPactDeclined(false);
        }
    }, [userProfile?.pactAccepted]);

    const commonProps = {
        language: currentLanguage || Language.Spanish,
    };

    const handleGoToVault = () => {
        navigate('/offgrid-vault');
    };

    const handleGoToOfflineHub = () => {
        navigate('/offline');
    };

    const routeCx: RouteConnectivityProps = {
        isOnline,
        serverReachable,
        onGoToVault: handleGoToVault,
        onGoToOfflineHub: handleGoToOfflineHub,
    };

    const cx = (policy: ConnectivityPolicy, children: React.ReactNode) =>
        withConnectivity(policy, routeCx, children);

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

                <Route path="/faq" element={
                    <PageTransition>
                        <Faq
                            onBack={() => navigate(-1)}
                            onSupportClick={() => navigate('/support')}
                        />
                    </PageTransition>
                } />

                {/* --- Private Routes (Wrapped in Layout + ProtectedRoute) --- */}
                <Route element={
                    <ProtectedRoute isLoggedIn={!!user}>
                        <PactGate
                            pactAccepted={userProfile?.pactAccepted}
                            profileLoaded={!user || !profileLoading}
                        >
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
                        </PactGate>
                    </ProtectedRoute>
                }>
                    <Route path="/home" element={
                        cx('banner',
                            <PageTransition>
                                <Home
                                    {...commonProps}
                                    onExplore={(id) => navigate(`/department/${id}`)}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onSearchClick={() => navigate('/search')}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/search" element={
                        cx('banner',
                            <PageTransition>
                                <ManualSearch
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onResultClick={(id) => navigate(`/destination/${id}`)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/department/:id" element={
                        cx('banner',
                            <PageTransition>
                                <DepartmentBriefing
                                    {...commonProps}
                                    onBack={() => navigate('/home')}
                                    onMoreInfo={(id: string) => navigate(`/agent-select/${id}`)}
                                    onDestinationClick={(id: string) => navigate(`/destination/${id}`)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/agent-select/:contextId" element={
                        cx('block',
                            <PageTransition>
                                <AgentSelector
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/live/:contextId" element={
                        cx('block',
                            <PageTransition>
                                <LiveAgent
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/destination/:id" element={
                        cx('banner',
                            <PageTransition>
                                <DestinationDetail
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/expedition/plan" element={
                        cx('block',
                            <PageTransition>
                                <ExpeditionDepartmentPicker
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/expedition/plan/:departmentId" element={
                        cx('block',
                            <PageTransition>
                                <ExpeditionPlannerPage
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/expedition/:expeditionId" element={
                        cx('banner',
                            <PageTransition>
                                <ExpeditionResultPage
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/chat/:contextId" element={
                        cx('block',
                            <PageTransition>
                                <Chat
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/support" element={
                        cx('banner',
                            <PageTransition>
                                <Support
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        )
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
                                onSettingsClick={() => navigate('/settings')}
                                onPremiumClick={() => navigate('/premium')}
                            />
                        </PageTransition>
                    } />

                    <Route path="/calendar" element={
                        cx('banner',
                            <PageTransition>
                                <FairsCalendar
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onFairClick={(id) => navigate(`/calendar/${id}`)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/calendar/:id" element={
                        cx('banner',
                            <PageTransition>
                                <FairDetail {...commonProps} onBack={() => navigate(-1)} />
                            </PageTransition>
                        )
                    } />

                    <Route path="/news/:id" element={
                        cx('banner',
                            <PageTransition>
                                <NewsDetail {...commonProps} onBack={() => navigate(-1)} />
                            </PageTransition>
                        )
                    } />

                    <Route path="/coupons/:id" element={
                        cx('banner',
                            <PageTransition>
                                <CouponDetail {...commonProps} onBack={() => navigate(-1)} />
                            </PageTransition>
                        )
                    } />

                    <Route path="/notifications" element={
                        cx('banner',
                            <PageTransition>
                                <Notifications
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                    onSettings={() => navigate('/settings/notifications')}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/settings" element={
                        <PageTransition>
                            <SettingsHub
                                {...commonProps}
                                onBack={() => navigate('/profile')}
                            />
                        </PageTransition>
                    } />

                    <Route path="/settings/app" element={
                        <PageTransition>
                            <AppSettings
                                {...commonProps}
                                onBack={() => navigate('/settings')}
                            />
                        </PageTransition>
                    } />

                    <Route path="/settings/notifications" element={
                        cx('banner',
                            <PageTransition>
                                <NotificationSettings {...commonProps} onBack={() => navigate(-1)} />
                            </PageTransition>
                        )
                    } />

                    <Route path="/settings/profile" element={
                        <PageTransition>
                            <ProfileSettings
                                {...commonProps}
                                onBack={() => navigate('/settings')}
                                onLogout={handleLogout}
                            />
                        </PageTransition>
                    } />

                    <Route path="/settings/premium" element={
                        <PageTransition>
                            <SettingsPremium
                                {...commonProps}
                                onBack={() => navigate('/settings')}
                            />
                        </PageTransition>
                    } />

                    <Route path="/settings/guardian" element={
                        <PageTransition>
                            <RoleSettingsPanel
                                {...commonProps}
                                role="guardian"
                                onBack={() => navigate('/settings')}
                            />
                        </PageTransition>
                    } />

                    <Route path="/settings/commercial" element={
                        <PageTransition>
                            <RoleSettingsPanel
                                {...commonProps}
                                role="commercial"
                                onBack={() => navigate('/settings')}
                            />
                        </PageTransition>
                    } />

                    <Route path="/settings/admin" element={
                        <PageTransition>
                            <RoleSettingsPanel
                                {...commonProps}
                                role="admin"
                                onBack={() => navigate('/settings')}
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
                                    onOpenDocuments={() => navigate(`/trips/${activeTrip.id}/documents`)}
                                    pastTripCount={pastTrips?.length ?? 0}
                                    pendingCount={tripPendingCount}
                                    syncing={tripSyncing}
                                    reconcileHint={tripReconcileHint}
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

                    <Route path="/trips/:tripId/documents" element={
                        <PageTransition>
                            <TripDocumentsPage
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
                        cx('banner',
                            <PageTransition>
                                <NewsFeed
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onProfileClick={() => navigate('/profile')}
                                    onNewsItemClick={(news) => navigate(`/news/${news.id}`)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/coupons" element={
                        cx('banner',
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
                        )
                    } />

                    <Route path="/refugios" element={
                        cx('banner',
                            <PageTransition>
                                <Refugios
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onRefugioClick={(id) => navigate(`/refugio/${id}`)}
                                    onPremiumClick={() => navigate('/premium')}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/refugio/:id" element={
                        cx('banner',
                            <PageTransition>
                                <RefugioDetail
                                    {...commonProps}
                                    onBack={() => navigate(-1)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/premium" element={
                        cx('block',
                            <PageTransition>
                                <Premium {...commonProps} onMenuClick={() => setMenuOpen(true)} />
                            </PageTransition>
                        )
                    } />

                    <Route path="/budget" element={
                        cx('banner',
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
                        )
                    } />

                    <Route path="/pact" element={
                        profileLoading ? (
                            <PactGateLoading />
                        ) : (
                        <PageTransition>
                            {pactDeclined && userProfile?.pactAccepted !== true ? (
                                <PactDeclined onLogout={handleLogout} />
                            ) : (
                                <HiddenPact
                                    {...commonProps}
                                    isAccepted={userProfile?.pactAccepted === true}
                                    gateMode={userProfile?.pactAccepted !== true}
                                    onMenuClick={() => setMenuOpen(true)}
                                    onDecline={
                                        userProfile?.pactAccepted !== true
                                            ? () => setPactDeclined(true)
                                            : undefined
                                    }
                                    onAccept={
                                        userProfile?.pactAccepted !== true
                                            ? async () => {
                                                if (user) {
                                                    await updateUserProfile(user.uid, { pactAccepted: true });
                                                    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
                                                    const target = from && from !== '/pact' ? from : '/home';
                                                    setTimeout(() => navigate(target, { replace: true }), 400);
                                                }
                                            }
                                            : undefined
                                    }
                                />
                            )}
                        </PageTransition>
                        )
                    } />

                    <Route path="/saved" element={
                        cx('banner',
                            <PageTransition>
                                <SavedDestinations
                                    {...commonProps}
                                    onBack={() => navigate('/profile')}
                                    onHome={() => navigate('/home')}
                                    onProfile={() => navigate('/profile')}
                                    onDestinationClick={(id) => navigate(`/destination/${id}`)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/saved/refugios" element={
                        cx('banner',
                            <PageTransition>
                                <SavedRefugios
                                    {...commonProps}
                                    onBack={() => navigate('/profile')}
                                    onHome={() => navigate('/home')}
                                    onProfile={() => navigate('/profile')}
                                    onRefugioClick={(id) => navigate(`/refugio/${id}`)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/saved/coupons" element={
                        cx('banner',
                            <PageTransition>
                                <SavedCoupons
                                    {...commonProps}
                                    onBack={() => navigate('/profile')}
                                    onHome={() => navigate('/home')}
                                    onProfile={() => navigate('/profile')}
                                    onCouponClick={(id) => navigate(`/coupons/${id}`)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/environmental-monitor" element={
                        cx('banner',
                            <PageTransition>
                                <EnvironmentalMonitor
                                    {...commonProps}
                                    onMenuClick={() => setMenuOpen(true)}
                                />
                            </PageTransition>
                        )
                    } />

                    <Route path="/offgrid-vault" element={
                        <PageTransition>
                            <OffGridVault
                                {...commonProps}
                                onMenuClick={() => setMenuOpen(true)}
                            />
                        </PageTransition>
                    } />

                    <Route path="/offline" element={
                        <PageTransition>
                            <SignalLostFallback
                                variant={!isOnline ? 'offline' : !serverReachable ? 'server' : 'offline'}
                                onGoToVault={handleGoToVault}
                                onGoToLedger={() => navigate('/budget')}
                                onMenuClick={() => setMenuOpen(true)}
                            />
                        </PageTransition>
                    } />

                    <Route path="/saved/fairs" element={
                        cx('banner',
                            <PageTransition>
                                <SavedFairs
                                    {...commonProps}
                                    onBack={() => navigate('/profile')}
                                    onFairClick={(id) => navigate(`/calendar/${id}`)}
                                />
                            </PageTransition>
                        )
                    } />
                </Route>
            </TypedRoutes>
    );
};
