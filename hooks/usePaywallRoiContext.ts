import { useMemo } from 'react';
import { useCoupons, useDestinations } from './useFirestore';
import { useDepartments } from './useContent';
import { useRevenueCat } from '../components/layout/RevenueCatProvider';
import {
    pickPaywallRoiEstimate,
    readLastVisitedDestinationContext,
    type PaywallRoiEstimate,
} from '../utils/paywallRoi';

export type PaywallRoiScope =
    | { kind: 'trip'; locationHint?: string }
    | { kind: 'destination'; destinationId: string; departmentId?: string; locationHint?: string }
    | { kind: 'lastVisited' };

export function usePaywallRoiContext(scope: PaywallRoiScope): {
    estimate: PaywallRoiEstimate | null;
    loading: boolean;
    isPremium: boolean;
    departmentName?: string;
    isContextual: boolean;
} {
    const { isPremium } = useRevenueCat();
    const { data: coupons = [], loading: loadingCoupons } = useCoupons();
    const { data: destinations = [], loading: loadingDests } = useDestinations();
    const { data: departments = [], loading: loadingDepts } = useDepartments();

    const lastVisited = useMemo(
        () => (scope.kind === 'lastVisited' ? readLastVisitedDestinationContext() : null),
        [scope.kind]
    );

    const estimate = useMemo(() => {
        if (isPremium) return null;

        if (scope.kind === 'trip') {
            return pickPaywallRoiEstimate(coupons, destinations, {
                locationHint: scope.locationHint,
            });
        }

        if (scope.kind === 'destination') {
            return pickPaywallRoiEstimate(coupons, destinations, {
                destinationId: scope.destinationId,
                departmentId: scope.departmentId,
                locationHint: scope.locationHint,
            });
        }

        const ctx = lastVisited ?? readLastVisitedDestinationContext();
        const departmentScoped = ctx.departmentId
            ? pickPaywallRoiEstimate(coupons, destinations, {
                  destinationId: ctx.destinationId,
                  departmentId: ctx.departmentId,
                  departmentOnly: true,
              })
            : null;

        if (departmentScoped) return departmentScoped;

        if (ctx.destinationId) {
            return pickPaywallRoiEstimate(coupons, destinations, {
                destinationId: ctx.destinationId,
                departmentId: ctx.departmentId,
            });
        }

        return pickPaywallRoiEstimate(coupons, destinations);
    }, [coupons, destinations, isPremium, lastVisited, scope]);

    const departmentIdForName =
        scope.kind === 'destination'
            ? scope.departmentId
            : scope.kind === 'lastVisited'
              ? estimate?.departmentId ?? lastVisited?.departmentId
              : undefined;

    const departmentName = departmentIdForName
        ? departments.find((d) => (d.departmentId || d.id) === departmentIdForName)?.name
        : undefined;

    const enrichedEstimate =
        estimate && departmentName ? { ...estimate, departmentName } : estimate;

    const isContextual =
        scope.kind === 'destination' ||
        (scope.kind === 'lastVisited' && Boolean(lastVisited?.departmentId || lastVisited?.destinationId));

    return {
        estimate: enrichedEstimate,
        loading: loadingCoupons || loadingDests || (scope.kind === 'lastVisited' && loadingDepts),
        isPremium,
        departmentName,
        isContextual,
    };
}
