/** Guest login stays on unless explicitly disabled (post-hackathon: set VITE_ENABLE_GUEST_LOGIN=false). */
export const isGuestLoginEnabled = import.meta.env.VITE_ENABLE_GUEST_LOGIN !== 'false';
