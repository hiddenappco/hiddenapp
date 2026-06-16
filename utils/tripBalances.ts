import type { Expense, Trip, TripMember } from '../types/trips';

export interface MemberBalance {
    uid: string;
    displayName: string;
    paid: number;
    share: number;
    /** Positive = should receive money; negative = owes money */
    net: number;
}

export interface Settlement {
    fromUid: string;
    fromName: string;
    toUid: string;
    toName: string;
    amount: number;
}

function memberName(members: TripMember[] | undefined, uid: string, fallback: string): string {
    return members?.find((m) => m.uid === uid)?.displayName || fallback;
}

export function computeMemberBalances(
    trip: Trip,
    expenses: Expense[],
    travelerFallback = 'Traveler'
): MemberBalance[] {
    const members = trip.members || [];
    const memberIds =
        trip.memberIds?.length ? trip.memberIds : members.map((m) => m.uid).filter(Boolean);
    if (!memberIds.length) {
        const owner = trip.ownerId || trip.userId;
        return [
            {
                uid: owner,
                displayName: memberName(members, owner, travelerFallback),
                paid: expenses.reduce((s, e) => s + e.amount, 0),
                share: expenses.reduce((s, e) => s + e.amount, 0),
                net: 0,
            },
        ];
    }

    const paidMap = new Map<string, number>();
    const shareMap = new Map<string, number>();
    for (const id of memberIds) {
        paidMap.set(id, 0);
        shareMap.set(id, 0);
    }

    for (const expense of expenses) {
        const payer = expense.paidByMemberId || trip.ownerId || trip.userId;
        const splitAmong =
            expense.splitAmong?.length ? expense.splitAmong : memberIds;
        const validSplit = splitAmong.filter((id) => memberIds.includes(id));
        const splitIds = validSplit.length ? validSplit : memberIds;
        const perPerson = expense.amount / splitIds.length;

        paidMap.set(payer, (paidMap.get(payer) || 0) + expense.amount);
        for (const id of splitIds) {
            shareMap.set(id, (shareMap.get(id) || 0) + perPerson);
        }
    }

    return memberIds.map((uid) => {
        const paid = Math.round(paidMap.get(uid) || 0);
        const share = Math.round(shareMap.get(uid) || 0);
        return {
            uid,
            displayName: memberName(members, uid, travelerFallback),
            paid,
            share,
            net: paid - share,
        };
    });
}

/** Greedy debt simplification (Tricount-style). Amounts in COP. */
export function simplifySettlements(balances: MemberBalance[]): Settlement[] {
    const creditors = balances
        .filter((b) => b.net > 0)
        .map((b) => ({ ...b }))
        .sort((a, b) => b.net - a.net);
    const debtors = balances
        .filter((b) => b.net < 0)
        .map((b) => ({ ...b }))
        .sort((a, b) => a.net - b.net);

    const settlements: Settlement[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const debt = Math.abs(debtors[i].net);
        const credit = creditors[j].net;
        const amount = Math.round(Math.min(debt, credit));
        if (amount >= 1) {
            settlements.push({
                fromUid: debtors[i].uid,
                fromName: debtors[i].displayName,
                toUid: creditors[j].uid,
                toName: creditors[j].displayName,
                amount,
            });
        }
        debtors[i].net += amount;
        creditors[j].net -= amount;
        if (debtors[i].net >= -1) i++;
        if (creditors[j].net <= 1) j++;
    }

    return settlements;
}
