import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '../types/core';

interface LanguageContextType {
    currentLanguage: Language;
    languageChosen: boolean;
    setLanguage: (lang: Language) => void;
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

    const setLanguage = (lang: Language) => {
        setCurrentLanguage(lang);
        setLanguageChosen(true);
        localStorage.setItem('app_language', lang);
        localStorage.setItem('language_chosen', 'true');
    };

    return (
        <LanguageContext.Provider value={{ currentLanguage, languageChosen, setLanguage }}>
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
