import React from 'react';

interface ChatInputProps {
    input: string;
    setInput: (val: string) => void;
    isSending: boolean;
    hasReachedLimit: boolean;
    handleSendMessage: () => void;
    onUpgrade: () => void;
    texts: {
        limitReached: string;
        upgrade: string;
        placeholder: string;
        limitReachedShort: string;
    };
}

export const ChatInput: React.FC<ChatInputProps> = ({
    input,
    setInput,
    isSending,
    hasReachedLimit,
    handleSendMessage,
    onUpgrade,
    texts,
}) => {
    return (
        <div className="absolute bottom-0 left-0 w-full bg-background-dark/95 backdrop-blur-md border-t border-overlay/10 pb-safe-input pt-4 z-20">
            <div className="flex flex-col gap-3 px-4">
                {hasReachedLimit && (
                    <div className="flex flex-col items-center gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2">
                        <p className="text-[11px] font-bold text-orange-400 uppercase tracking-widest text-center">
                            {texts.limitReached}
                        </p>
                        <button
                            onClick={onUpgrade}
                            className="px-4 py-1.5 bg-primary text-black text-[10px] font-black rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-all"
                        >
                            {texts.upgrade}
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-2 shadow-2xl">
                    <div className="flex-1 relative">
                        <input
                            className={`w-full bg-surface-dark border-transparent focus:border-primary focus:ring-1 focus:ring-primary/30 text-content rounded-full pl-5 pr-5 py-3.5 text-base placeholder:text-content-subtle shadow-inner transition-all ${hasReachedLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder={hasReachedLimit ? texts.limitReachedShort : texts.placeholder}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            disabled={isSending || hasReachedLimit}
                        />
                    </div>
                    <button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isSending || hasReachedLimit}
                        className={`p-3.5 rounded-full transition-all flex items-center justify-center shadow-lg active:scale-90
                            ${!input.trim() || isSending || hasReachedLimit
                                ? 'bg-overlay/15 text-content-muted opacity-50'
                                : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'}
                        `}
                    >
                        <span className={`material-symbols-outlined filled-icon ${isSending ? 'animate-spin' : ''}`}>
                            {isSending ? 'progress_activity' : 'send'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
