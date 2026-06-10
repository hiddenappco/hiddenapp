/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./utils/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}"
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Core Brand Colors
                "primary": "#FF6B35",
                "secondary": "#0D1B2A",
                "accent": "#2D6A4F",
                "background-light": "#FFFFFF",
                "background-dark": "var(--color-bg-dark)",
                "surface": "#FFFFFF",
                "surface-alt": "#F3F4F6",
                "surface-dark": "var(--color-surface-dark)",

                // Semantic Theme Tokens
                "content": "var(--color-content)",
                "content-secondary": "var(--color-content-secondary)",
                "content-muted": "var(--color-content-muted)",
                "content-subtle": "var(--color-content-subtle)",
                "overlay": "rgb(var(--color-overlay) / <alpha-value>)",

                // Legacy Support (Login/Language)
                "sunset-orange": "#FF7E39",
                "deep-blue": "#0D1B2A",
                "jungle-green": "#1B4332",
                "text-main": "#1F2937",
                "text-muted": "#6B7280",
                "dark-green": "#14532d",
                "off-white": "#f8fafc",

                // Feature Specific Palettes
                "chat-primary": "#FF7E35",
                "chat-secondary": "#0C2444",
                "chat-accent": "#1B4D3E",
                "chat-bg": "#FFFFFF",
                "chat-surface": "#F1F5F9",
                "chat-bubble": "#F1F5F9",

                "nav-primary": "#FF7E36",
                "nav-secondary": "#0A2540",
                "nav-accent": "#1E5631",
                "nav-bg-light": "#FFFFFF",
                "nav-bg-dark": "var(--color-nav-bg-dark)",

                "search-accent": "#155D27",
                "search-bg-dark": "#0A1F35",
                "card-dark": "var(--color-card-dark)",

                "dest-secondary": "#0B1E3B",
                "dest-surface-variant": "#F1F5F9",
                "dest-text-body": "#64748B",

                "news-secondary": "#0B2545",
                "news-accent": "#1A4D2E",
                "news-bg-dark": "var(--color-news-bg-dark)",
                "news-card-dark": "var(--color-news-card-dark)",
                "news-surface-dark": "var(--color-news-surface-dark)",

                "perks-primary": "#FF7E36",
                "perks-secondary": "#0B2545",
                "perks-accent": "#1E5631",
                "perks-surface": "#F8FAFC",
                "perks-highlight": "#F1F5F9",

                "support-secondary": "#002B49",
                "support-accent": "#1E4D2B",
                "support-bg-dark": "#0B1521",
                "support-surface": "#F8FAFC",

                "profile-primary": "#FB923C",
                "profile-primary-dark": "#EA580C",
                "profile-deep-blue": "#0F172A",
                "profile-deep-blue-light": "#1E293B",
                "profile-jungle-green": "#15803D",
                "profile-surface-light": "#F8FAFC",
                "profile-text-muted": "#64748B",
                "profile-border-light": "#E2E8F0",

                "premium-secondary": "#0D1B2A",
                "premium-accent": "#1B4D3E",
                "premium-bg-dark": "#0D1B2A",
                "premium-surface-dark": "#163A66",

                "budget-primary": "#ff7e47",
                "budget-primary-dark": "#e0602d",
                "budget-accent-blue": "#0f2c4f",
                "budget-accent-green": "#1a4d2e",
                "budget-surface": "#f8f9fa",
                "budget-text-sub": "#64748b",
            },
            fontFamily: {
                "display": ["Poppins", "sans-serif"],
                "body": ["Poppins", "sans-serif"],
                "sans": ["Poppins", "sans-serif"],
            },
            borderColor: {
                "overlay": "rgb(var(--color-border-overlay) / <alpha-value>)",
            },
            borderRadius: {
                "xl": "1rem",
                "2xl": "1.5rem",
                "3xl": "2rem",
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'premium-soft': '0 4px 20px -2px rgba(15, 44, 89, 0.08)',
                'premium-glow': '0 4px 20px -2px rgba(255, 107, 53, 0.4)',
            }
        },
    },
    plugins: [],
}
