import { lazy, type ComponentType } from 'react';

function lazyPage<T extends ComponentType<any>>(
    factory: () => Promise<Record<string, unknown>>,
    exportName: string
) {
    return lazy(() =>
        factory().then((mod) => ({
            default: mod[exportName] as T,
        }))
    );
}

/** Heavy / secondary screens — loaded on demand to keep the initial bundle lean. */
export const DepartmentBriefing = lazyPage(() => import('../DepartmentBriefing'), 'DepartmentBriefing');
export const Chat = lazyPage(() => import('../Chat'), 'Chat');
export const ManualSearch = lazyPage(() => import('../ManualSearch'), 'ManualSearch');
export const DestinationDetail = lazyPage(() => import('../DestinationDetail'), 'DestinationDetail');
export const NewsFeed = lazyPage(() => import('../NewsFeed'), 'NewsFeed');
export const NewsDetail = lazyPage(() => import('../NewsDetail'), 'NewsDetail');
export const Coupons = lazyPage(() => import('../Coupons'), 'Coupons');
export const CouponDetail = lazyPage(() => import('../CouponDetail'), 'CouponDetail');
export const Support = lazyPage(() => import('../Support'), 'Support');
export const Profile = lazyPage(() => import('../Profile'), 'Profile');
export const Premium = lazyPage(() => import('../Premium'), 'Premium');
export const CreateTrip = lazyPage(() => import('../CreateTrip'), 'CreateTrip');
export const TripExpenses = lazyPage(() => import('../TripExpenses'), 'TripExpenses');
export const TripHistoryDetail = lazyPage(() => import('../TripHistoryDetail'), 'TripHistoryDetail');
export const JoinTrip = lazyPage(() => import('../JoinTrip'), 'JoinTrip');
export const CurrencyConverter = lazyPage(() => import('../CurrencyConverter'), 'CurrencyConverter');
export const SavedDestinations = lazyPage(() => import('../SavedDestinations'), 'SavedDestinations');
export const SavedCoupons = lazyPage(() => import('../SavedCoupons'), 'SavedCoupons');
export const SavedFairs = lazyPage(() => import('../SavedFairs'), 'SavedFairs');
export const FairsCalendar = lazyPage(() => import('../FairsCalendar'), 'FairsCalendar');
export const FairDetail = lazyPage(() => import('../FairDetail'), 'FairDetail');
export const Notifications = lazyPage(() => import('../Notifications'), 'Notifications');
export const NotificationSettings = lazyPage(() => import('../NotificationSettings'), 'NotificationSettings');
export const ProfileSettings = lazyPage(() => import('../ProfileSettings'), 'ProfileSettings');
export const SettingsHub = lazyPage(() => import('../settings/SettingsHub'), 'SettingsHub');
export const AppSettings = lazyPage(() => import('../settings/AppSettings'), 'AppSettings');
export const SettingsPremium = lazyPage(() => import('../settings/SettingsPremium'), 'SettingsPremium');
export const RoleSettingsPanel = lazyPage(() => import('../settings/SettingsPremium'), 'RoleSettingsPanel');
export const Faq = lazyPage(() => import('../Faq'), 'Faq');
export const HiddenPact = lazyPage(() => import('../HiddenPact'), 'HiddenPact');
export const EnvironmentalMonitor = lazyPage(() => import('../EnvironmentalMonitor'), 'EnvironmentalMonitor');
export const AgentSelector = lazyPage(() => import('../AgentSelector'), 'AgentSelector');
export const LiveAgent = lazyPage(() => import('../LiveAgent'), 'LiveAgent');
export const OffGridVault = lazyPage(() => import('../OffGridVault'), 'OffGridVault');
export const Refugios = lazyPage(() => import('../Refugios'), 'Refugios');
export const RefugioDetail = lazyPage(() => import('../RefugioDetail'), 'RefugioDetail');
export const SavedRefugios = lazyPage(() => import('../SavedRefugios'), 'SavedRefugios');
export const ExpeditionPlannerPage = lazyPage(
    () => import('../expedition/ExpeditionPlannerPage'),
    'ExpeditionPlannerPage'
);
export const ExpeditionResultPage = lazyPage(
    () => import('../expedition/ExpeditionResultPage'),
    'ExpeditionResultPage'
);
export const ExpeditionDepartmentPicker = lazyPage(
    () => import('../expedition/ExpeditionDepartmentPicker'),
    'ExpeditionDepartmentPicker'
);
