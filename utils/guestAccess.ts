/** Guest login stays on unless explicitly disabled (post-hackathon: set VITE_ENABLE_GUEST_LOGIN=false). */
export const isGuestLoginEnabled = import.meta.env.VITE_ENABLE_GUEST_LOGIN !== 'false';

/**
 * When `true`, anonymous guests are treated as full Premium (hackathon demos only).
 * **Production default: `false`** — guests use the Free tier like registered Free users.
 */
export const GUEST_HACKATHON_PREMIUM = false;
