export type TripCurrency = 'COP' | 'USD' | 'EUR';

export type ExpenseCategory =
    | 'food'
    | 'transport'
    | 'lodging'
    | 'tours'
    | 'shopping'
    | 'health'
    | 'entertainment'
    | 'tips'
    | 'misc';

export type TripMemberRole = 'owner' | 'editor' | 'observer';

export type TripActivityKind = 'expense_added' | 'expense_deleted' | 'member_joined';

export interface TripActivityActor {
    uid: string;
    displayName: string;
}

export interface TripActivityEntry {
    id: string;
    kind: TripActivityKind;
    actorUid: string;
    actorName: string;
    /** Epoch ms for display; Firestore Timestamp when read from cloud */
    createdAt: number;
    expenseId?: string;
    amountCOP?: number;
    note?: string;
    category?: ExpenseCategory;
    pendingSync?: boolean;
    localOnly?: boolean;
}

export interface TripMember {
    uid: string;
    displayName: string;
    role: TripMemberRole;
    joinedAt: string;
}

export interface Expense {
    id: string;
    category: ExpenseCategory;
    /** Amount stored in COP (canonical ledger currency) */
    amount: number;
    amountOriginal?: number;
    currency?: TripCurrency;
    exchangeRate?: number;
    exchangeRateDate?: string;
    note: string;
    time: string;
    paidByMemberId?: string;
    /** Member uids sharing this expense equally (group trips) */
    splitAmong?: string[];
    pendingSync?: boolean;
    localOnly?: boolean;
}

export interface Trip {
    id: string;
    name: string;
    location: string;
    date: string;
    status: 'active' | 'completed';
    expenses: Expense[];
    image?: string;
    totalSpent?: number;
    userId: string;
    ownerId?: string;
    type?: 'solo' | 'group';
    tripCode?: string;
    members?: TripMember[];
    memberIds?: string[];
    editorIds?: string[];
    defaultCurrency?: TripCurrency;
    pdfUrl?: string;
    pdfExpiresAt?: { toDate: () => Date } | string | Date;
}

export interface ExchangeRates {
    COP_per_USD: number;
    COP_per_EUR: number;
    source: string;
    updatedAt: string;
    trmDate?: string;
}
