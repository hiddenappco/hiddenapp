import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

interface ControlBarProps {
    isMuted: boolean;
    isRecording: boolean;
    onToggleMute: () => void;
    onToggleRecording: () => void;
    onHangUp: () => void;
}

/**
 * ControlBar — Bottom controls for the Live Mode session.
 * Mute, Record, and Hang Up (Audio-Only).
 */
export const ControlBar: React.FC<ControlBarProps> = ({
    isMuted,
    isRecording,
    onToggleMute,
    onToggleRecording,
    onHangUp,
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center gap-5 pb-safe-input">
            {/* Main Action buttons */}
            <div className="flex items-center gap-6">
                {/* Mute Button */}
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onToggleMute}
                    className={`size-14 rounded-full flex items-center justify-center transition-all border ${
                        isMuted
                            ? 'bg-red-500/20 border-red-500/30 text-red-400'
                            : 'bg-overlay/10 border-overlay/10 text-content hover:bg-overlay/20'
                    }`}
                >
                    <span className="material-symbols-outlined text-[24px]">
                        {isMuted ? 'mic_off' : 'mic'}
                    </span>
                </motion.button>

                {/* Hang Up Button */}
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onHangUp}
                    className="size-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-colors"
                >
                    <span className="material-symbols-outlined text-[28px]">call_end</span>
                </motion.button>
            </div>

            {/* Record indicator button */}
            <button
                onClick={onToggleRecording}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                    isRecording
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'text-content/20 hover:text-content/40'
                }`}
            >
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-overlay/20'}`}></span>
                {isRecording ? t('live.recording') : t('live.recordSession')}
            </button>
        </div>
    );
};
