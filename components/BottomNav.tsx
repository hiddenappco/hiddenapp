import React from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';

interface BottomNavProps {
  language: Language;
  activeTab: 'home' | 'news' | 'search' | 'coupons' | 'profile';
  onNavigate: (tab: 'home' | 'news' | 'search' | 'coupons' | 'profile') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onNavigate }) => {
  const { t } = useTranslation();

  const navItems = [
    {
      id: 'news',
      label: t('nav.news'),
      icon: "newspaper",
      filledIcon: "newspaper"
    },
    {
      id: 'search',
      label: t('nav.search'),
      icon: "search",
      filledIcon: "search"
    },
    {
      id: 'home',
      label: t('nav.map'),
      icon: "map",
      filledIcon: "map"
    },
    {
      id: 'coupons',
      label: t('nav.coupons'),
      icon: "loyalty",
      filledIcon: "loyalty"
    },
    {
      id: 'profile',
      label: t('nav.profile'),
      icon: "person",
      filledIcon: "person"
    }
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-background-dark border-t border-overlay/5 pb-safe pt-2 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.4)]">
      <div className="flex justify-around items-end px-2 pb-4">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as any)}
              className={`flex flex-1 flex-col items-center justify-end gap-1 transition-colors group ${isActive
                  ? 'text-primary'
                  : 'text-content-subtle hover:text-content'
                }`}
            >
              <span
                className={`material-symbols-outlined text-2xl transition-transform group-active:scale-95 ${isActive ? 'scale-110' : ''}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium leading-normal tracking-[0.015em] ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
