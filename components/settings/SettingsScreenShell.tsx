import React from 'react';

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
        <header className="sticky top-0 z-10 bg-background-dark/95 backdrop-blur-sm border-b border-overlay/5 transition-colors shrink-0">
            <div className="flex items-center justify-between p-4 pb-3 pt-safe-hero">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors text-content"
                >
                    <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
                </button>
                <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center text-content px-2 truncate">
                    {title}
                </h2>
                <div className="flex size-10 shrink-0 items-center justify-center">
                    {headerRight ?? null}
                </div>
            </div>
        </header>
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24">{children}</main>
    </div>
);
