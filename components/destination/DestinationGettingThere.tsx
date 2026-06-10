import React from 'react';

interface GettingThereProps {
    gettingThere: any[];
    texts: any;
}

export const DestinationGettingThere: React.FC<GettingThereProps> = ({
    gettingThere,
    texts
}) => {
    if (!gettingThere || gettingThere.length === 0) return null;

    return (
        <div className="px-5 mt-6">
            <div className="bg-surface-dark border border-overlay/5 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-xl text-content mb-4">{texts.gettingThereTitle}</h3>
                <div className="flex flex-col gap-4">
                    {gettingThere.map((method, idx) => (
                        <div key={idx} className="flex gap-3 items-start">
                            <div className="bg-primary/10 p-2 rounded-full shrink-0 mt-0.5">
                                <span className="material-symbols-outlined text-primary text-sm">
                                    {method.modalidad.toLowerCase().includes('público') || method.modalidad.toLowerCase().includes('public') ? 'directions_bus' : 'directions_car'}
                                </span>
                            </div>
                            <div>
                                <h4 className="text-content text-sm font-bold mb-1">{method.modalidad}</h4>
                                <p className="text-content-secondary text-sm leading-relaxed">
                                    {method.instrucciones}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
