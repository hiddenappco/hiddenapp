import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '../types/core';
import { hasDownloadedPacks, markPackLanguageRefreshNeeded } from '../utils/offgridPackLanguageAlert';

export type PackLanguageNotice = 'online' | 'offline';

interface LanguageContextType {
    currentLanguage: Language;
    languageChosen: boolean;
    setLanguage: (lang: Language) => void;
    packLanguageNotice: PackLanguageNotice | null;
    dismissPackLanguageNotice: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem('app_language');
        return (saved as Language) || Language.Spanish;
    });

    const [languageChosen, setLanguageChosen] = useState<boolean>(() => {
        return localStorage.getItem('language_chosen') === 'true';
    });

    const [packLanguageNotice, setPackLanguageNotice] = useState<PackLanguageNotice | null>(null);

    const setLanguage = (lang: Language) => {
        if (lang !== currentLanguage) {
            if (hasDownloadedPacks()) {
                markPackLanguageRefreshNeeded(lang);
                const offline =
                    typeof navigator !== 'undefined' && navigator.onLine === false;
                setPackLanguageNotice(offline ? 'offline' : 'online');
            }
            setCurrentLanguage(lang);
            setLanguageChosen(true);
            localStorage.setItem('app_language', lang);
            localStorage.setItem('language_chosen', 'true');
        }
    };

    const dismissPackLanguageNotice = () => setPackLanguageNotice(null);

    return (
        <LanguageContext.Provider
            value={{
                currentLanguage,
                languageChosen,
                setLanguage,
                packLanguageNotice,
                dismissPackLanguageNotice,
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
