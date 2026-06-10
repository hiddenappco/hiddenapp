import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme } from '../types/core';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('app_theme');
        if (saved === 'light' || saved === 'dark') {
            return saved as Theme;
        }
        // Fallback to system preference, default to dark
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return Theme.Light;
        }
        return Theme.Dark;
    });

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('app_theme', newTheme);
    };

    const toggleTheme = () => {
        setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark);
    };

    useEffect(() => {
        const root = window.document.documentElement;
        const body = window.document.body;
        
        if (theme === Theme.Dark) {
            root.classList.add('dark');
            body.classList.add('dark');
            root.classList.remove('light');
            body.classList.remove('light');
        } else {
            root.classList.add('light');
            body.classList.add('light');
            root.classList.remove('dark');
            body.classList.remove('dark');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
