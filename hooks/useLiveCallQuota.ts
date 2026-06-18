import { useMemo } from 'react';
import { useUserProfile } from './useSocial';
import { computeLiveCallQuota } from '../utils/liveCallQuota';

export function useLiveCallQuota(userId: string | undefined) {
    const { data: profile, loading } = useUserProfile(userId);

    const quota = useMemo(() => computeLiveCallQuota(profile), [profile]);

    return { quota, loading };
}
