import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../types/core';
import { es } from '../locales/es';
import { en } from '../locales/en';

export const useTranslation = () => {
    const { currentLanguage } = useLanguage();
    
    const translations = currentLanguage === Language.English ? en : es;

    const t = (key: string, variables?: Record<string, string | number>) => {
        // Resolve nested keys e.g., 'settings.title'
        const keys = key.split('.');
        let value: any = translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Fallback to es
                let esValue: any = es;
                for (const esK of keys) {
                    if (esValue && typeof esValue === 'object' && esK in esValue) {
                        esValue = esValue[esK];
                    } else {
                        esValue = undefined;
                    }
                }
                value = esValue || key;
                break;
            }
        }

        if (typeof value === 'string') {
            if (variables) {
                let replaced = value;
                Object.entries(variables).forEach(([vKey, vVal]) => {
                    replaced = replaced.replace(`{${vKey}}`, String(vVal));
                });
                return replaced;
            }
            return value;
        }

        return typeof value === 'string' || typeof value === 'number' ? String(value) : key;
    };

    return { t, language: currentLanguage, isSpanish: currentLanguage === Language.Spanish };
};
