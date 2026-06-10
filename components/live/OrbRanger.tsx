import React from 'react';
import { motion } from 'framer-motion';

interface OrbRangerProps {
    agentVolume: number;   // 0-1 from agent's audio track
    userVolume: number;    // 0-1 from user's mic
    isConnected: boolean;
    isReconnecting?: boolean;
    agentName: string;
}

/**
 * OrbRanger — The holographic visual centerpiece of Live Mode.
 * 
 * A glassmorphic orb that reacts in real-time to audio frequencies
 * from the Hyperlocal Department Agent's voice session.
 * - Idle: gentle, slow breathing pulse
 * - Agent speaking: expands with warm orange glow
 * - User speaking: subtle indigo ring response
 * - Reconnecting: desaturated pulse, gray tones
 */
export const OrbRanger: React.FC<OrbRangerProps> = ({ agentVolume, userVolume, isConnected, isReconnecting, agentName }) => {
    // Scale the orb based on audio volume
    const agentScale = 1 + agentVolume * 0.35;
    const agentGlow = isReconnecting ? 0 : agentVolume * 0.6;
    const userRingScale = 1 + userVolume * 0.25;

    return (
        <div className="relative flex items-center justify-center w-full" style={{ height: '280px' }}>
            {/* Outer ambient rings */}
            <motion.div
                animate={{
                    scale: isConnected && !isReconnecting ? [1, 1.15, 1] : 1,
                    opacity: isConnected && !isReconnecting ? [0.03, 0.06, 0.03] : 0,
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-64 h-64 rounded-full border border-primary/10"
            />
            <motion.div
                animate={{
                    scale: isConnected && !isReconnecting ? [1.05, 1.2, 1.05] : 1,
                    opacity: isConnected && !isReconnecting ? [0.02, 0.04, 0.02] : 0,
                }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute w-72 h-72 rounded-full border border-indigo-500/10"
            />

            {/* User voice ring (indigo) */}
            <motion.div
                animate={{ scale: userRingScale, opacity: isReconnecting ? 0 : userVolume * 0.4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute w-48 h-48 rounded-full border-2 border-indigo-400/30"
                style={{
                    boxShadow: `0 0 ${30 * userVolume}px rgba(99, 102, 241, ${userVolume * 0.3})`,
                }}
            />

            {/* Main Orb — Agent Voice */}
            <motion.div
                animate={{
                    scale: isReconnecting ? [1, 1.02, 1] : agentScale,
                }}
                transition={
                    isReconnecting 
                    ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } 
                    : { type: 'spring', stiffness: 400, damping: 25 }
                }
                className="relative w-40 h-40 rounded-full flex items-center justify-center transition-colors duration-1000"
                style={{
                    background: isReconnecting 
                        ? `radial-gradient(circle at 35% 35%, rgba(150, 150, 150, 0.15) 0%, rgba(100, 100, 100, 0.1) 50%, rgba(13, 27, 42, 0.8) 100%)`
                        : `radial-gradient(circle at 35% 35%, rgba(255, 107, 53, ${0.15 + agentGlow}) 0%, rgba(99, 102, 241, ${0.08 + agentGlow * 0.3}) 50%, rgba(13, 27, 42, 0.8) 100%)`,
                    boxShadow: isReconnecting
                        ? `0 0 40px rgba(150, 150, 150, 0.1), inset 0 0 40px rgba(255, 255, 255, 0.03)`
                        : `0 0 ${40 + agentVolume * 60}px rgba(255, 107, 53, ${0.1 + agentGlow}), 0 0 ${80 + agentVolume * 100}px rgba(255, 107, 53, ${0.05 + agentGlow * 0.5}), inset 0 0 40px rgba(255, 255, 255, 0.03)`,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                {/* Inner shimmer */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-2 rounded-full"
                    style={{
                        background: isReconnecting
                            ? 'conic-gradient(from 0deg, transparent 0%, rgba(150,150,150,0.05) 25%, transparent 50%, rgba(100,100,100,0.05) 75%, transparent 100%)'
                            : 'conic-gradient(from 0deg, transparent 0%, rgba(255,107,53,0.05) 25%, transparent 50%, rgba(99,102,241,0.05) 75%, transparent 100%)',
                    }}
                />

                {/* Center icon */}
                <div className="relative z-10 flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-content/60 text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {isReconnecting ? 'wifi_off' : 'graphic_eq'}
                    </span>
                </div>
            </motion.div>

            {/* Agent Name */}
            <div className="absolute bottom-4 text-center">
                <p className="text-xs font-black uppercase tracking-[3px] text-content/30">
                    {agentName}
                </p>
                {isConnected && !isReconnecting && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        <span className="text-[9px] font-bold text-green-400/60 uppercase tracking-widest">LIVE</span>
                    </div>
                )}
                {isReconnecting && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                        <span className="text-[9px] font-bold text-yellow-400/60 uppercase tracking-widest">RECONECTANDO...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
