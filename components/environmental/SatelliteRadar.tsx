import React from 'react';

interface SatelliteRadarProps {
    selectedDestination: any;
    isMonitoring: boolean;
}

export const SatelliteRadar: React.FC<SatelliteRadarProps> = ({
    selectedDestination,
    isMonitoring
}) => {
    return (
        <div className="mt-2 w-full h-56 rounded-xl bg-surface-dark border border-overlay/10 flex flex-col relative overflow-hidden group">
            {selectedDestination?.coordinates ? (
                <div className="absolute inset-0 z-0">
                    <iframe
                        title="Satellite View"
                        width="100%"
                        height="100%"
                        style={{ border: 0, filter: 'grayscale(0.5) contrast(1.2)' }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://maps.google.com/maps?q=${selectedDestination.coordinates.lat},${selectedDestination.coordinates.lng}&t=k&z=16&output=embed`}
                    ></iframe>
                    {isMonitoring && <div className="neon-scan"></div>}
                </div>
            ) : (
                <div className="absolute inset-0 bg-[url('/assets/ui/radar-bg.png')] bg-cover bg-center opacity-20 dark:opacity-30 grayscale invert dark:invert-0 mix-blend-multiply dark:mix-blend-screen"></div>
            )}

            <div className="absolute inset-0 border border-overlay/10 pointer-events-none rounded-xl"></div>
        </div>
    );
};
