import React from 'react';

interface ChatHeaderProps {
    onBack: () => void;
    title: string;
    onlineText: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    onBack,
    title,
    onlineText,
}) => {
    return (
        <header className="flex items-center justify-between p-4 pt-safe bg-background-dark/95 backdrop-blur-md border-b border-overlay/10 z-10 shadow-sm">
            <button
                onClick={onBack}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-overlay/10 transition-colors text-content"
            >
                <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <div className="flex flex-col items-center">
                <h1 className="text-content text-lg font-bold leading-tight">{title}</h1>
                <div className="flex items-center gap-1.5 opacity-90">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                    </span>
                    <span className="text-xs font-bold text-green-400">{onlineText}</span>
                </div>
            </div>
            <div className="w-10"></div> {/* Spacer to maintain centering */}
        </header>
    );
};
