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

export type TripActivityKind =
    | 'expense_added'
    | 'expense_deleted'
    | 'member_joined'
    | 'document_added'
    | 'document_deleted';

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
    documentId?: string;
    documentName?: string;
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

/** Coupon redemption at a verified refugio (P2-ESG-01 direct economic injection). */
export interface ExpenseDirectCommunity {
    couponId: string;
    refugioId: string;
    /** Validated host share from refugio catalog (0–100). */
    hostSharePercent: number;
    /** COP reaching the host directly (amount × hostSharePercent / 100). */
    injectionCop: number;
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
    /** Tagged coupon redemption at verified refugio — counted for ESG metric. */
    directCommunity?: ExpenseDirectCommunity;
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
    finishedAt?: { toDate: () => Date; seconds?: number } | string | Date;
}

export interface TripDocument {
    id: string;
    tripId: string;
    fileName: string;
    /** User-friendly label (e.g. "Recibo de hospedaje"). Falls back to `fileName`
     * for display when empty. `fileName` stays the technical name (with extension)
     * used for the storage path. */
    title?: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    downloadUrl?: string;
    uploadedByUid: string;
    uploadedByName: string;
    /** Epoch ms (local mirror); Firestore uses Timestamp on read */
    createdAt: number;
    expenseId?: string;
    deleted?: boolean;
    deletedAt?: number;
    deletedByUid?: string;
    pendingSync?: boolean;
    localOnly?: boolean;
    /** Relative path inside Capacitor Directory.Data */
    localPath?: string;
    uploadPending?: boolean;
}

export interface ExchangeRates {
    COP_per_USD: number;
    COP_per_EUR: number;
    source: string;
    updatedAt: string;
    trmDate?: string;
}
