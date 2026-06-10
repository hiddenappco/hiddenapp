import React from 'react';
import { normalizeImage } from '../../utils/imageHelpers';

interface DestinationHeroProps {
    destination: any;
    displayTitle?: string;
    displayLocation?: string;
    galleryImages: string[];
    onBack: () => void;
    onShare: () => void;
    onToggleFavorite: () => void;
    isSaved: boolean;
    favLoading: boolean;
    texts: any;
}

export const DestinationHero: React.FC<DestinationHeroProps> = ({
    destination,
    displayTitle,
    displayLocation,
    galleryImages,
    onBack,
    onShare,
    onToggleFavorite,
    isSaved,
    favLoading,
    texts
}) => {
    const heroImage = destination ? normalizeImage(destination.heroImage) : '';

    return (
        <div className="relative h-[45vh] min-h-[400px] shrink-0">
            <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar bg-overlay/10">
                {galleryImages.length > 0 ? (
                    galleryImages.map((img, index) => (
                        <div key={index} className="shrink-0 w-full h-full relative snap-center">
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url("${img}")` }}
                            ></div>
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
                        </div>
                    ))
                ) : (
                    <div className="shrink-0 w-full h-full relative snap-center">
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url("${heroImage}")` }}
                        ></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
                    </div>
                )}
            </div>

            <div className="absolute top-0 left-0 p-4 pt-safe-hero z-20 w-full flex justify-between pointer-events-none">
                <button onClick={onBack} className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white border border-overlay/20 hover:bg-black/40 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="flex gap-3 pointer-events-auto">
                    <button
                        onClick={onShare}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white border border-overlay/20 hover:bg-black/40 transition-colors"
                    >
                        <span className="material-symbols-outlined">share</span>
                    </button>
                    <button
                        onClick={onToggleFavorite}
                        disabled={favLoading}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-overlay/20 hover:bg-black/40 transition-colors"
                    >
                        <span className={`material-symbols-outlined ${isSaved ? 'text-red-500 filled-icon' : 'text-white'}`}>favorite</span>
                    </button>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 px-5 pb-8 w-full z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-2 pointer-events-auto">
                    {!destination.status && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">{texts.closed}</span>
                    )}
                    {destination.verified && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 backdrop-blur-md border border-blue-400/30 rounded-lg text-blue-100 text-xs font-bold">
                            <span className="material-symbols-outlined text-[14px] text-blue-400">verified</span>
                            {texts.verified}
                        </div>
                    )}
                </div>
                <h1 className="text-4xl font-extrabold text-white leading-tight mb-1 drop-shadow-md">{displayTitle || destination.title}</h1>
                <div className="flex items-center text-white/90 text-sm font-medium gap-1">
                    <span className="material-symbols-outlined text-[#ee9d2b] text-[18px] shrink-0">location_on</span>
                    <p className="leading-none drop-shadow-sm">{displayLocation || destination.location}</p>
                </div>
            </div>
        </div>
    );
};
