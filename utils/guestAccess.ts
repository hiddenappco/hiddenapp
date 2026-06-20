/** Guest login stays on unless explicitly disabled (post-hackathon: set VITE_ENABLE_GUEST_LOGIN=false). */
export const isGuestLoginEnabled = import.meta.env.VITE_ENABLE_GUEST_LOGIN !== 'false';

/**
 * Hackathon window: guest profiles (and accounts upgraded from guest) keep Premium.
 * Set to `false` post-hackathon when guests become Free tier.
 */
export const GUEST_HACKATHON_PREMIUM = true;
