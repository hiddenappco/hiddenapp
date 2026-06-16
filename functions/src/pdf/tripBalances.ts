import type { PdfLanguage } from './shared';

export interface TripBalanceRow {
    uid: string;
    displayName: string;
    paid: number;
    share: number;
    net: number;
}

export interface TripSettlementRow {
    fromName: string;
    toName: string;
    amount: number;
}

function memberName(members: Array<{ uid: string; displayName?: string }> | undefined, uid: string, fallback: string): string {
    return members?.find((m) => m.uid === uid)?.displayName || fallback;
}

export function computeTripBalances(
    trip: Record<string, unknown>,
    expenses: Array<Record<string, unknown>>,
    travelerFallback: string
): TripBalanceRow[] {
    const members = (trip.members as Array<{ uid: string; displayName?: string }>) || [];
    const memberIds = (trip.memberIds as string[])?.length
        ? (trip.memberIds as string[])
        : members.map((m) => m.uid).filter(Boolean);

    if (!memberIds.length) {
        const owner = String(trip.ownerId || trip.userId || '');
        const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return [
            {
                uid: owner,
                displayName: memberName(members, owner, travelerFallback),
                paid: total,
                share: total,
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

    const ownerId = String(trip.ownerId || trip.userId || '');

    for (const expense of expenses) {
        const payer = String(expense.paidByMemberId || ownerId);
        const splitAmong = (expense.splitAmong as string[])?.length
            ? (expense.splitAmong as string[]).filter((id) => memberIds.includes(id))
            : memberIds;
        const splitIds = splitAmong.length ? splitAmong : memberIds;
        const amount = Number(expense.amount) || 0;
        const perPerson = amount / splitIds.length;

        paidMap.set(payer, (paidMap.get(payer) || 0) + amount);
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

export function simplifyTripSettlements(balances: TripBalanceRow[]): TripSettlementRow[] {
    const creditors = balances.filter((b) => b.net > 0).map((b) => ({ ...b }));
    const debtors = balances.filter((b) => b.net < 0).map((b) => ({ ...b }));
    creditors.sort((a, b) => b.net - a.net);
    debtors.sort((a, b) => a.net - b.net);

    const settlements: TripSettlementRow[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const amount = Math.round(Math.min(Math.abs(debtors[i].net), creditors[j].net));
        if (amount >= 1) {
            settlements.push({
                fromName: debtors[i].displayName,
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

export function categoryLabels(lang: PdfLanguage): Record<string, string> {
    const es: Record<string, string> = {
        food: 'Alimentación',
        transport: 'Transporte',
        lodging: 'Hospedaje',
        tours: 'Tours',
        shopping: 'Compras',
        health: 'Salud',
        entertainment: 'Ocio',
        tips: 'Propinas',
        misc: 'Varios',
    };
    const en: Record<string, string> = {
        food: 'Food',
        transport: 'Transport',
        lodging: 'Lodging',
        tours: 'Tours',
        shopping: 'Shopping',
        health: 'Health',
        entertainment: 'Entertainment',
        tips: 'Tips',
        misc: 'Miscellaneous',
    };
    return lang === 'en' ? en : es;
}
