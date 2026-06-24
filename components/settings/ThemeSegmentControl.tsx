import React from 'react';
import { Theme } from '../../types/core';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';

interface ThemeSegmentControlProps {
    onThemeChange?: (theme: Theme) => void;
}

export const ThemeSegmentControl: React.FC<ThemeSegmentControlProps> = ({ onThemeChange }) => {
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();

    const select = (next: Theme) => {
        setTheme(next);
        onThemeChange?.(next);
    };

    return (
        <div className="flex bg-surface-dark border border-overlay/10 rounded-2xl p-1.5 w-full relative">
            <div
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-primary rounded-xl transition-all duration-300 ease-out transform ${
                    theme === Theme.Light ? 'translate-x-0' : 'translate-x-full'
                }`}
            />
            <button
                type="button"
                onClick={() => select(Theme.Light)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm z-10 transition-colors duration-300 ${
                    theme === Theme.Light ? 'text-content' : 'text-content-secondary hover:text-content'
                }`}
            >
                <span className="material-symbols-outlined text-[20px]">light_mode</span>
                <span>{t('settings.themeLight')}</span>
            </button>
            <button
                type="button"
                onClick={() => select(Theme.Dark)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm z-10 transition-colors duration-300 ${
                    theme === Theme.Dark ? 'text-content' : 'text-content-secondary hover:text-content'
                }`}
            >
                <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                <span>{t('settings.themeDark')}</span>
            </button>
        </div>
    );
};
