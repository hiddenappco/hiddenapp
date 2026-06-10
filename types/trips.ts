export interface Expense {
    id: string;
    category: 'food' | 'transport' | 'lodging' | 'tours' | 'misc';
    amount: number;
    note: string;
    time: string;
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
}
