import { useMemo } from 'react';
import { useUserProfile } from './useSocial';
import { computeLiveCallQuota, type LiveCallUsageRaw } from '../utils/liveCallQuota';

export function useLiveCallQuota(userId: string | undefined) {
    const { data: profile, loading } = useUserProfile(userId);

    const quota = useMemo(() => {
        const raw = (profile as { liveCallUsage?: LiveCallUsageRaw } | null)?.liveCallUsage;
        return computeLiveCallQuota(raw);
    }, [profile]);

    return { quota, loading };
}
