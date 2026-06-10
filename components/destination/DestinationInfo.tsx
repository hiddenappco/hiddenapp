import React from 'react';

interface DestinationInfoProps {
    description: string;
    stats: any;
    aiTip: string;
    isExpanded: boolean;
    setIsExpanded: (val: boolean) => void;
    texts: any;
}

export const DestinationInfo: React.FC<DestinationInfoProps> = ({
    description,
    stats,
    aiTip,
    isExpanded,
    setIsExpanded,
    texts
}) => {
    return (
        <div className="px-5 space-y-6">
            <div>
                <h3 className="text-content text-lg font-bold mb-2">{texts.aboutTitle}</h3>
                <p className={`text-content-secondary text-sm leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                    {description}
                </p>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-primary text-sm font-bold mt-2 flex items-center gap-1"
                >
                    {isExpanded ? texts.readLess : texts.readMore} 
                    <span className="material-symbols-outlined text-[16px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-dark p-3 rounded-xl border border-overlay/5 flex flex-col items-center gap-2 text-center">
                    <span className="material-symbols-outlined text-primary">hiking</span>
                    <span className="text-content-secondary text-xs font-medium">{texts.stats.hiking}</span>
                    <span className="text-content font-bold text-sm">{stats?.hiking || '--'}</span>
                </div>
                <div className="bg-surface-dark p-3 rounded-xl border border-overlay/5 flex flex-col items-center gap-2 text-center opacity-70">
                    <span className="material-symbols-outlined text-green-500">signal_cellular_alt</span>
                    <span className="text-content-secondary text-xs font-medium">{texts.stats.signal}</span>
                    <span className="text-content font-bold text-sm">{stats?.signal || '--'}</span>
                </div>
            </div>

            {aiTip && (
                <div className="bg-gradient-to-r from-blue-500/10 dark:from-blue-900/20 to-surface-dark border border-blue-500/20 rounded-xl p-4 flex gap-3 items-start shadow-sm">
                    <div className="bg-blue-500/10 p-2 rounded-full shrink-0">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">smart_toy</span>
                    </div>
                    <div>
                        <h4 className="text-content text-sm font-bold mb-1">{texts.aiTipTitle}</h4>
                        <p className="text-content-secondary text-xs leading-relaxed">
                            {aiTip}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
