import React from 'react';
import { StickyGlassHeader } from '../ui/StickyGlassHeader';

interface SettingsScreenShellProps {
    title: string;
    onBack: () => void;
    children: React.ReactNode;
    headerRight?: React.ReactNode;
}

export const SettingsScreenShell: React.FC<SettingsScreenShellProps> = ({
    title,
    onBack,
    children,
    headerRight,
}) => (
    <div className="bg-background-dark font-display text-content antialiased h-screen w-full flex flex-col overflow-hidden relative z-50">
        <StickyGlassHeader
            onBack={onBack}
            title={title}
            titleLarge
            showLogo={!headerRight}
            right={headerRight}
        />
        <main className="flex-1 overflow-y-auto no-scrollbar pb-[calc(6rem+var(--safe-bottom))]">{children}</main>
    </div>
);
