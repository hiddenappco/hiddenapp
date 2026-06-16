import type { ExpenseCategory } from '../types/trips';

export const EXPENSE_CATEGORY_KEYS: Record<ExpenseCategory, string> = {
    food: 'trips.categoryFood',
    transport: 'trips.categoryTransport',
    lodging: 'trips.categoryLodging',
    tours: 'trips.categoryTours',
    shopping: 'trips.categoryShopping',
    health: 'trips.categoryHealth',
    entertainment: 'trips.categoryEntertainment',
    tips: 'trips.categoryTips',
    misc: 'trips.categoryMisc',
};

export const EXPENSE_CATEGORIES_CONFIG: Record<
    ExpenseCategory,
    { icon: string; color: string; barColor: string; bg: string }
> = {
    food: { icon: 'restaurant', color: 'text-orange-400', barColor: 'bg-orange-500', bg: 'bg-orange-500/10' },
    transport: { icon: 'directions_bus', color: 'text-blue-400', barColor: 'bg-blue-500', bg: 'bg-blue-500/10' },
    lodging: { icon: 'hotel', color: 'text-indigo-400', barColor: 'bg-indigo-500', bg: 'bg-indigo-500/10' },
    tours: { icon: 'hiking', color: 'text-green-400', barColor: 'bg-green-500', bg: 'bg-green-500/10' },
    shopping: { icon: 'shopping_bag', color: 'text-pink-400', barColor: 'bg-pink-500', bg: 'bg-pink-500/10' },
    health: { icon: 'medical_services', color: 'text-red-400', barColor: 'bg-red-500', bg: 'bg-red-500/10' },
    entertainment: { icon: 'nightlife', color: 'text-purple-400', barColor: 'bg-purple-500', bg: 'bg-purple-500/10' },
    tips: { icon: 'volunteer_activism', color: 'text-amber-400', barColor: 'bg-amber-500', bg: 'bg-amber-500/10' },
    misc: { icon: 'receipt_long', color: 'text-content-muted', barColor: 'bg-gray-500', bg: 'bg-gray-500/10' },
};

export const EXPENSE_CATEGORY_LIST = Object.keys(EXPENSE_CATEGORIES_CONFIG) as ExpenseCategory[];
