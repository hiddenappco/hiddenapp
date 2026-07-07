import React from 'react';
import { StickyGlassHeader } from '../ui/StickyGlassHeader';

interface ChatHeaderProps {
    onBack: () => void;
    title: string;
    onlineText: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onBack, title, onlineText }) => (
    <StickyGlassHeader
        onBack={onBack}
        title={title}
        subtitle={onlineText}
        showLogo={false}
        className="shadow-sm"
    />
);
