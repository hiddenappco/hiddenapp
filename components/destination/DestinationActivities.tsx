import React from 'react';

interface DestinationActivitiesProps {
    activities: string[];
    completedActivities: number[];
    onToggleActivity: (index: number) => void;
    texts: any;
}

export const DestinationActivities: React.FC<DestinationActivitiesProps> = ({
    activities,
    completedActivities,
    onToggleActivity,
    texts
}) => {
    if (!activities || activities.length === 0) return null;

    return (
        <div className="px-5 mt-6">
            <div className="bg-surface-dark border border-overlay/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-xl text-content">{texts.activitiesTitle}</h3>
                    <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold border border-primary/30">
                        {completedActivities.length} / {activities.length}
                    </div>
                </div>
                <p className="text-content-muted text-xs mb-4">{texts.activitiesSubtitle}</p>
                
                <div className="w-full bg-overlay/10 rounded-full h-1.5 mb-5 overflow-hidden">
                    <div 
                        className="bg-primary h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${(completedActivities.length / activities.length) * 100}%` }}
                    ></div>
                </div>

                <div className="space-y-3">
                    {activities.map((activity: string, idx: number) => {
                        const isChecked = completedActivities.includes(idx);
                        return (
                            <button
                                key={idx}
                                onClick={() => onToggleActivity(idx)}
                                className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left active:scale-[0.98] ${
                                    isChecked 
                                        ? 'bg-primary/10 border-primary/30' 
                                        : 'bg-overlay/5 border-overlay/10 hover:bg-overlay/10'
                                }`}
                            >
                                <div className={`shrink-0 size-6 flex items-center justify-center rounded-full mt-0.5 transition-colors border ${
                                    isChecked 
                                        ? 'bg-primary border-primary text-secondary' 
                                        : 'border-content-subtle text-transparent'
                                }`}>
                                    <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                                </div>
                                <span className={`text-sm leading-tight transition-all ${
                                    isChecked ? 'text-content/70 line-through' : 'text-content/90'
                                }`}>
                                    {activity}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
