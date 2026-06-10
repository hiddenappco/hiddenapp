import React from 'react';
import { NavigationMenu } from '../NavigationMenu';
import { Language } from '../../types/core';
import { AnimatedLayoutOutlet } from './AnimatedLayoutOutlet';

interface LayoutProps {
    language: Language;
    // Removed explicit state props to decouple from App
    onLogout: () => void;
    onNavigate: (path: string) => void;
    // Optional props if we still want to control it externally, but for refactor we'll simplify
    onMenuClose: () => void;
    onMenuOpen: () => void;
    isMenuOpen: boolean; // Keep for now as App passes it, but we won't use it for state really?
}

export const Layout: React.FC<LayoutProps> = ({
    language,
    onLogout,
    onNavigate,
    isMenuOpen,
    onMenuClose,
    onMenuOpen
}) => {
    // Local state removed in favor of lifted state from App.tsx
    // const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const handleMenuClose = onMenuClose;
    const handleMenuOpen = onMenuOpen;

    // We need to inject the "Open Menu" trigger into the Outlet context or provide a way for children to open it.
    // For now, let's pass context.

    return (
        <div className="relative w-full h-screen overflow-hidden bg-background-dark">
            <NavigationMenu
                isOpen={isMenuOpen}
                onClose={handleMenuClose}
                language={language}
                onLogout={onLogout}
                onHomeClick={() => { handleMenuClose(); onNavigate('/home'); }}
                onSearchClick={() => { handleMenuClose(); onNavigate('/search'); }}
                onNewsClick={() => { handleMenuClose(); onNavigate('/news'); }}
                onPerksClick={() => { handleMenuClose(); onNavigate('/coupons'); }}
                onSupportClick={() => { handleMenuClose(); onNavigate('/support'); }}
                onProfileClick={() => { handleMenuClose(); onNavigate('/profile'); }}
                onPremiumClick={() => { handleMenuClose(); onNavigate('/premium'); }}
                onBudgetClick={() => { handleMenuClose(); onNavigate('/budget'); }}
                onSavedClick={() => { handleMenuClose(); onNavigate('/saved'); }}
                onCalendarClick={() => { handleMenuClose(); onNavigate('/calendar'); }}
                onNotificationsClick={() => { handleMenuClose(); onNavigate('/notifications'); }}
                onPactClick={() => { handleMenuClose(); onNavigate('/pact'); }}
                onMonitorClick={() => { handleMenuClose(); onNavigate('/environmental-monitor'); }}
                onRefugiosClick={() => { handleMenuClose(); onNavigate('/refugios'); }}
                onOffGridClick={() => { handleMenuClose(); onNavigate('/offgrid-vault'); }}
            />

            {/* Main Content Area */}
            <div className="w-full h-full min-h-0">
                <AnimatedLayoutOutlet outletContext={{ openMenu: handleMenuOpen }} />
            </div>
        </div>
    );
};
