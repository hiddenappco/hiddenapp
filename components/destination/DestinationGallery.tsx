import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface DestinationGalleryProps {
    galleryImages: string[];
    heroImage: string;
    expandedIdx: number | null;
    setExpandedIdx: (idx: number | null) => void;
    texts: any;
}

export const DestinationGallery: React.FC<DestinationGalleryProps> = ({
    galleryImages,
    heroImage,
    expandedIdx,
    setExpandedIdx,
    texts
}) => {
    const imagesToDisplay = galleryImages.length > 0 ? galleryImages : [heroImage];

    return (
        <div className="px-5 mt-6">
            <h3 className="font-bold text-xl mb-4 text-content">{texts.galleryTitle}</h3>
            <div className="flex overflow-x-auto hide-scrollbar gap-3 -mx-5 px-5 pb-4">
                {imagesToDisplay.map((img, idx) => (
                    <div
                        key={idx}
                        className="flex flex-col gap-2 min-w-[140px] cursor-pointer"
                        onClick={() => setExpandedIdx(idx)}
                    >
                        <div className="w-full aspect-[3/4] bg-cover bg-center rounded-xl shadow-md border border-overlay/10" style={{ backgroundImage: `url("${img}")` }}></div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {expandedIdx !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center"
                    >
                        <button
                            onClick={() => setExpandedIdx(null)}
                            className="absolute top-12 right-6 z-[110] size-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-white/20"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        {imagesToDisplay.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setExpandedIdx(prev => (prev !== null && prev > 0) ? prev - 1 : prev); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 z-[110] size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10"
                                >
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setExpandedIdx(prev => (prev !== null && prev < imagesToDisplay.length - 1) ? prev + 1 : prev); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 z-[110] size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10"
                                >
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </>
                        )}

                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                            <motion.div
                                key={expandedIdx}
                                initial={{ x: 300, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -300, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="w-full h-full flex items-center justify-center p-0"
                            >
                                <TransformWrapper
                                    initialScale={1}
                                    minScale={1}
                                    maxScale={4}
                                    centerOnInit={true}
                                >
                                    <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <img
                                            src={imagesToDisplay[expandedIdx]}
                                            alt={`Gallery ${expandedIdx}`}
                                            className="max-w-full max-h-[85vh] object-contain"
                                        />
                                    </TransformComponent>
                                </TransformWrapper>
                            </motion.div>
                        </div>

                        <div className="absolute bottom-12 left-0 w-full flex flex-col items-center gap-4 px-6 z-[110] pointer-events-none">
                            <div className="flex gap-2">
                                {imagesToDisplay.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`size-1.5 rounded-full transition-all ${i === expandedIdx ? 'w-6 bg-primary' : 'bg-white/20'}`}
                                    />
                                ))}
                            </div>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center">
                                {texts.pinchZoom}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
