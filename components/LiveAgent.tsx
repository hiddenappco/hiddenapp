import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Language } from '../types/core';
import { useAuth } from './layout/AuthProvider';
import { useDepartment, useAssistant } from '../hooks/useFirestore';
import { API_ENDPOINTS, LIVEKIT_CONFIG } from '../config/constants';
import { resolveEffectiveDepartmentId } from '../utils/departmentIds';
import { motion, AnimatePresence } from 'framer-motion';

// LiveKit
import {
    LiveKitRoom,
    useVoiceAssistant,
    useTrackVolume,
    useTracks,
    useConnectionState,
    useLocalParticipant,
    RoomAudioRenderer,
} from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { useHardwareBackHandler } from '../hooks/useHardwareBackHandler';
import { useLiveCallQuota } from '../hooks/useLiveCallQuota';
import { addLiveCallSeconds } from '../services/liveCallUsage';

// Sub-components
import { OrbRanger } from './live/OrbRanger';
import { ControlBar } from './live/ControlBar';
import { LiveCallQuotaBar } from './live/LiveCallQuotaBar';
import { useTranslation } from '../hooks/useTranslation';

// ─── Elegant Call Sound Utilities (Web Audio API — no external files) ─────────
const playCallSound = (type: 'connect' | 'hangup') => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();

        if (type === 'connect') {
            // Ascending two-tone chime: C5 → E5 (pleasant, professional)
            [523.25, 659.25].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
                gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + i * 0.15 + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.35);
                osc.connect(gain).connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.15);
                osc.stop(ctx.currentTime + i * 0.15 + 0.4);
            });
        } else {
            // Descending single soft tone: G4 → fade (clean, non-intrusive)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(392, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(330, ctx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.45);
        }

        // Auto-close context after sounds finish
        setTimeout(() => ctx.close(), 1000);
    } catch (e) {
        // Silently fail — sound is a UX enhancement, not critical
    }
};

interface LiveAgentProps {
    language: Language;
    onBack: () => void;
}

type LiveState = 'connecting' | 'connected' | 'error' | 'disconnected';

export const LiveAgent: React.FC<LiveAgentProps> = ({ language, onBack }) => {
    const { contextId } = useParams<{ contextId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { data: department } = useDepartment(contextId || undefined);
    const { data: assistant } = useAssistant(contextId || undefined);

    const [isCallActive, setIsCallActive] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [liveState, setLiveState] = useState<LiveState>('connecting');
    const [isMuted, setIsMuted] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);
    const [locationChecked, setLocationChecked] = useState(false);
    const [gpsReady, setGpsReady] = useState(false);
    const tokenCoordsSignatureRef = useRef<string | null>(null);
    const sessionRemainingRef = useRef(0);
    const flushedSecondsRef = useRef(0);
    const [liveSessionSeconds, setLiveSessionSeconds] = useState(0);
    const { quota, loading: quotaLoading } = useLiveCallQuota(user?.uid);
    const agentName = assistant?.name || t('live.hiddenGuide');

    const flushSessionSeconds = useCallback(
        async (totalSessionSeconds: number) => {
            if (!user?.uid) return;
            const toFlush = Math.max(0, Math.floor(totalSessionSeconds) - flushedSecondsRef.current);
            if (toFlush > 0) {
                await addLiveCallSeconds(user.uid, toFlush);
                flushedSecondsRef.current = Math.floor(totalSessionSeconds);
            }
        },
        [user?.uid]
    );

    // GPS Location
    useEffect(() => {
        const fetchLocation = async () => {
            try {
                const platform = Capacitor.getPlatform();
                if (platform !== 'web') {
                    const permission = await Geolocation.checkPermissions();
                    if (permission.location !== 'granted') {
                        const request = await Geolocation.requestPermissions();
                        if (request.location !== 'granted') return;
                    }
                }
                const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
                setUserCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
            } catch (err: any) {
                if (Capacitor.getPlatform() === 'web' || err.message?.includes('web')) {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => setUserCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                        () => {}
                    );
                }
            } finally {
                setLocationChecked(true);
            }
        };
        fetchLocation();
    }, []);

    // Esperar GPS hasta 6s antes de pedir token (evita metadata sin ubicación)
    useEffect(() => {
        if (!locationChecked) return;
        if (userCoordinates) {
            setGpsReady(true);
            return;
        }
        const timer = setTimeout(() => setGpsReady(true), 6000);
        return () => clearTimeout(timer);
    }, [locationChecked, userCoordinates]);

    // Fetch LiveKit token when call starts; re-fetch if GPS arrives after first token
    useEffect(() => {
        const fetchToken = async () => {
            if (!user || !contextId || !gpsReady || !isCallActive) return;

            const coordsSignature = userCoordinates
                ? `${userCoordinates.lat.toFixed(5)},${userCoordinates.lng.toFixed(5)}`
                : 'no-gps';

            if (tokenCoordsSignatureRef.current === coordsSignature && token) return;

            try {
                setLiveState('connecting');
                setError(null);
                const effectiveDeptId = resolveEffectiveDepartmentId(contextId, department);

                const response = await fetch(API_ENDPOINTS.GENERATE_LIVEKIT_TOKEN, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.uid,
                        userName: user.displayName || 'Explorer',
                        departmentId: effectiveDeptId,
                        userCoordinates: userCoordinates,
                        language,
                    }),
                });

                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    if (response.status === 403 && errBody.error === 'LIVE_QUOTA_EXCEEDED') {
                        setError(t('live.quotaExceededTitle'));
                        setLiveState('error');
                        setIsCallActive(false);
                        return;
                    }
                    throw new Error(errBody.message || 'Failed to get LiveKit token');
                }

                const data = await response.json();
                if (data.success && data.token) {
                    tokenCoordsSignatureRef.current = coordsSignature;
                    setToken(data.token);
                } else {
                    throw new Error(data.error || 'Invalid token response');
                }
            } catch (err) {
                console.error('[LiveAgent] Token error:', err);
                setError(t('live.connectError'));
                setLiveState('error');
            }
        };

        fetchToken();
    }, [user, contextId, t, gpsReady, userCoordinates, isCallActive, token, department, language]);

    const handleHangUp = useCallback(() => {
        playCallSound('hangup');
        setLiveState('connecting');
        setToken(null);
        tokenCoordsSignatureRef.current = null;
        setGpsReady(false);
        setIsCallActive(false);
        setLiveSessionSeconds(0);
        flushedSecondsRef.current = 0;
    }, []);

    const handleAgentSessionStart = useCallback(() => {
        sessionRemainingRef.current = quota.remainingSeconds;
        flushedSecondsRef.current = 0;
        setLiveSessionSeconds(0);
    }, [quota.remainingSeconds]);

    const handleAgentSessionTick = useCallback(
        (elapsed: number) => {
            setLiveSessionSeconds(elapsed);
            const cap = sessionRemainingRef.current;
            if (cap > 0 && elapsed >= cap) {
                alert(t('live.quotaAutoHangup'));
                handleHangUp();
            } else if (elapsed > 0 && elapsed - flushedSecondsRef.current >= 30) {
                void flushSessionSeconds(elapsed);
            }
        },
        [flushSessionSeconds, handleHangUp, t]
    );

    const handleAgentSessionEnd = useCallback(
        async (elapsed: number) => {
            if (elapsed > 0) {
                await flushSessionSeconds(elapsed);
            }
            setLiveSessionSeconds(0);
            flushedSecondsRef.current = 0;
        },
        [flushSessionSeconds]
    );

    const handleStartCall = useCallback(() => {
        if (quota.isBlocked || quota.remainingSeconds <= 0) return;
        setIsCallActive(true);
    }, [quota.isBlocked, quota.remainingSeconds]);

    useHardwareBackHandler(() => {
        if (isCallActive) {
            handleHangUp();
            return true;
        }
        return false;
    }, [isCallActive, handleHangUp]);

    const handleToggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    const handleToggleRecording = useCallback(() => {
        setIsRecording(prev => !prev);
    }, []);

    const texts = {
        connecting: t('live.connecting'),
        connected: t('live.sessionActive'),
        error: t('live.connectionError'),
        retry: t('live.retry'),
        hint: t('live.hint'),
    };

    // Error state
    if (liveState === 'error') {
        return (
            <div className="bg-background-dark font-display antialiased text-content h-screen w-full flex flex-col items-center justify-center gap-6 p-8">
                <div className="size-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-400 text-[36px]">error</span>
                </div>
                <p className="text-center text-content-muted text-sm max-w-xs">{error || texts.error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm active:scale-95 transition-transform"
                >
                    {texts.retry}
                </button>
                <button
                    onClick={onBack}
                    className="text-content-subtle text-sm font-medium"
                >
                    {t('common.back')}
                </button>
            </div>
        );
    }

    // ─── Screen 1: Persistent Call Starter Page (Call is NOT active) ─────────
    if (!isCallActive) {
        const callDisabled = quotaLoading || quota.isBlocked || quota.remainingSeconds <= 0;

        return (
            <div className="bg-background-dark font-display antialiased text-content h-screen w-full flex flex-col overflow-hidden relative">
                {/* Background Decoratives */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-10%] left-[50%] translate-x-[-50%] w-[450px] h-[450px] bg-primary/5 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-indigo-600/3 rounded-full blur-[100px]"></div>
                </div>

                {/* Header */}
                <header className="sticky top-0 z-30 flex items-center justify-between bg-background-dark/80 backdrop-blur-md px-4 pb-2 pt-safe border-b border-overlay/5">
                    <button
                        onClick={onBack}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors text-content"
                    >
                        <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-content">{department?.name || agentName}</span>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                            {t('live.voiceAgent')}
                        </span>
                    </div>
                    <div className="size-10"></div>
                </header>

                {/* Body Content */}
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center z-10 gap-8">
                    {/* Agent Avatar Frame with Pulsing Soft Aura */}
                    <div className="relative flex items-center justify-center">
                        {/* Soft ambient orange glow pulsing in background */}
                        <div className="absolute size-40 bg-primary/20 rounded-full animate-pulse blur-xl"></div>
                        <div className="size-32 rounded-full border border-overlay/10 bg-surface-dark flex items-center justify-center shadow-2xl relative overflow-hidden">
                            <span className="material-symbols-outlined text-primary text-[64px] animate-pulse">support_agent</span>
                        </div>
                    </div>

                    {/* Titles */}
                    <div className="flex flex-col gap-2 max-w-sm">
                        <h2 className="text-3xl font-extrabold tracking-tight text-content animate-fade-in">
                            {t('live.readyTitle')}
                        </h2>
                        <p className="text-content-muted text-sm leading-relaxed">
                            {t('live.readyDesc', { name: agentName })}
                        </p>
                    </div>

                    {!quotaLoading && (
                        <LiveCallQuotaBar quota={quota} />
                    )}

                    {/* Big Green Calling Button with Pulsing Wave Rings */}
                    <div className="flex flex-col items-center gap-4 mt-2">
                        <div className="relative flex items-center justify-center">
                            {!callDisabled && (
                                <>
                                    <div className="absolute size-28 bg-emerald-500/20 rounded-full animate-ping pointer-events-none" style={{ animationDuration: '2.5s' }}></div>
                                    <div className="absolute size-32 bg-emerald-500/10 rounded-full animate-pulse pointer-events-none"></div>
                                </>
                            )}

                            <button
                                type="button"
                                onClick={handleStartCall}
                                disabled={callDisabled}
                                className={`relative z-10 flex size-24 items-center justify-center rounded-full transition-all text-white shadow-xl ${
                                    callDisabled
                                        ? 'bg-overlay/20 text-content/30 cursor-not-allowed shadow-none'
                                        : 'bg-emerald-500 hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-emerald-500/40'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[44px]">
                                    {callDisabled ? 'phone_disabled' : 'phone_in_talk'}
                                </span>
                            </button>
                        </div>
                        <span
                            className={`text-xs font-bold uppercase tracking-widest ${
                                callDisabled ? 'text-content/40' : 'text-emerald-400 animate-pulse'
                            }`}
                        >
                            {callDisabled ? t('live.quotaNoTime') : t('live.startCall')}
                        </span>
                        {callDisabled && !quotaLoading && (
                            <p className="text-[10px] text-content/45 max-w-[260px] text-center leading-relaxed">
                                {t('live.quotaBlockedCall')}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Screen 2: Active Voice Call Layout ─────────
    return (
        <div className="bg-background-dark font-display antialiased text-content h-screen w-full flex flex-col overflow-hidden relative">
            
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[-15%] left-[50%] translate-x-[-50%] w-[500px] h-[500px] bg-primary/3 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-indigo-600/3 rounded-full blur-[100px]"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-30 flex items-center justify-between bg-background-dark/80 backdrop-blur-md px-4 pb-2 pt-safe border-b border-overlay/5">
                <button
                    onClick={handleHangUp}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors text-content"
                >
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-content">{department?.name || agentName}</span>
                    <AnimatePresence mode="wait">
                        {liveState === 'connecting' ? (
                            <motion.span
                                key="connecting"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                                {texts.connecting}
                            </motion.span>
                        ) : (
                            <motion.span
                                key="connected"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-1"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                {texts.connected}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
                <div className="size-10 flex items-center justify-end">
                    {liveState === 'connected' && (
                        <span className="text-[9px] font-bold text-primary tabular-nums">
                            {liveSessionSeconds > 0 ? `${Math.floor(liveSessionSeconds / 60)}:${(liveSessionSeconds % 60).toString().padStart(2, '0')}` : ''}
                        </span>
                    )}
                </div>
            </header>

            {liveState === 'connected' && (
                <div className="px-4 z-20 -mt-1">
                    <LiveCallQuotaBar quota={quota} compact showSession sessionSeconds={liveSessionSeconds} />
                </div>
            )}

            {/* Main Content */}
            {token ? (
                <LiveKitRoom
                    serverUrl={LIVEKIT_CONFIG.URL}
                    token={token}
                    connect={true}
                    audio={!isMuted}
                    video={false} // Cleanly disable local camera capturing & popup permission
                    onConnected={() => setLiveState('connected')}
                    onDisconnected={() => setLiveState('disconnected')}
                    className="flex-1 flex flex-col z-10"
                    options={{
                        publishDefaults: {
                            videoEncoding: false, // Ensure no camera video is proposed
                        }
                    }}
                >
                    <LiveRoomContent
                        agentName={agentName}
                        isMuted={isMuted}
                        isRecording={isRecording}
                        onToggleMute={handleToggleMute}
                        onToggleRecording={handleToggleRecording}
                        onHangUp={handleHangUp}
                        hint={texts.hint}
                        onAgentSessionStart={handleAgentSessionStart}
                        onAgentSessionTick={handleAgentSessionTick}
                        onAgentSessionEnd={handleAgentSessionEnd}
                    />
                    {/* Habilita la reproducción real de audio */}
                    <RoomAudioRenderer />
                </LiveKitRoom>
            ) : (
                // Loading state
                <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10">
                    <OrbRanger 
                        agentVolume={0} 
                        userVolume={0} 
                        isConnected={false} 
                        agentName={agentName} 
                    />
                    <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-sm text-content-subtle font-medium"
                    >
                        {texts.connecting}
                    </motion.div>
                </div>
            )}
        </div>
    );
};

/**
 * LiveRoomContent — Inner component that runs inside <LiveKitRoom>.
 * Has access to LiveKit hooks for audio tracks and volume,
 * and manages local call recording without duplicate mic permission requests.
 */
const LiveRoomContent: React.FC<{
    agentName: string;
    isMuted: boolean;
    isRecording: boolean;
    onToggleMute: () => void;
    onToggleRecording: () => void;
    onHangUp: () => void;
    hint: string;
    onAgentSessionStart: () => void;
    onAgentSessionTick: (elapsed: number) => void;
    onAgentSessionEnd: (elapsed: number) => void;
}> = ({
    agentName,
    isMuted,
    isRecording,
    onToggleMute,
    onToggleRecording,
    onHangUp,
    hint,
    onAgentSessionStart,
    onAgentSessionTick,
    onAgentSessionEnd,
}) => {
    const connectionState = useConnectionState();
    const isConnected = connectionState === ConnectionState.Connected;

    const prevAgentConnected = useRef(false);
    const agentTracks_all = useTracks([Track.Source.Microphone], { onlySubscribed: true });
    const hasAgent = agentTracks_all.some(t => t.participant.isAgent);

    const sessionStartRef = useRef<number | null>(null);
    const billingEndedRef = useRef(false);

    const endBillingSession = useCallback(() => {
        if (billingEndedRef.current || sessionStartRef.current === null) return;
        billingEndedRef.current = true;
        const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        sessionStartRef.current = null;
        onAgentSessionEnd(elapsed);
    }, [onAgentSessionEnd]);

    useEffect(() => {
        if (hasAgent && isConnected) {
            if (!prevAgentConnected.current) {
                playCallSound('connect');
                billingEndedRef.current = false;
                sessionStartRef.current = Date.now();
                onAgentSessionStart();
            }
            prevAgentConnected.current = true;

            const interval = window.setInterval(() => {
                if (sessionStartRef.current === null) return;
                const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
                onAgentSessionTick(elapsed);
            }, 1000);

            return () => clearInterval(interval);
        }

        if (prevAgentConnected.current) {
            endBillingSession();
        }
        prevAgentConnected.current = false;

        return undefined;
    }, [hasAgent, isConnected, onAgentSessionStart, onAgentSessionTick, endBillingSession]);

    useEffect(() => {
        return () => endBillingSession();
    }, [endBillingSession]);
    
    // Get agent's audio track volume
    const agentTracks = useTracks([Track.Source.Microphone], { onlySubscribed: true });
    const agentAudioTrack = agentTracks.find(t => t.participant.isAgent);
    const agentVolume = useTrackVolume(agentAudioTrack);

    // Get user's local audio volume
    const { localParticipant } = useLocalParticipant();
    const localTracks = useTracks([Track.Source.Microphone], { onlySubscribed: false });
    const localAudioTrack = localTracks.find(t => t.participant.identity === localParticipant.identity);
    const userVolume = useTrackVolume(localAudioTrack);

    // Recording refs and setup
    const recorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (isRecording) {
            try {
                // Extract MediaStreamTrack directly from the active livekit tracks
                // to avoid calling getUserMedia() a second time and causing mic lockouts.
                const localTrack = localAudioTrack?.publication?.track?.mediaStreamTrack;
                const agentTrack = agentAudioTrack?.publication?.track?.mediaStreamTrack;

                if (!localTrack && !agentTrack) {
                    console.warn("[Recording] No audio tracks found to record.");
                    return;
                }

                // Create Web Audio API pipeline
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const audioCtx = new AudioContextClass();
                audioContextRef.current = audioCtx;
                const dest = audioCtx.createMediaStreamDestination();

                if (localTrack) {
                    const localStream = new MediaStream([localTrack]);
                    const localSource = audioCtx.createMediaStreamSource(localStream);
                    localSource.connect(dest);
                }

                if (agentTrack) {
                    const agentStream = new MediaStream([agentTrack]);
                    const agentSource = audioCtx.createMediaStreamSource(agentStream);
                    agentSource.connect(dest);
                }

                chunksRef.current = [];
                const recorder = new MediaRecorder(dest.stream, {
                    mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
                });
                recorderRef.current = recorder;

                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        chunksRef.current.push(e.data);
                    }
                };

                recorder.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `hidden_live_${agentName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 100);
                };

                recorder.start();
                console.log("[Recording] Call recording started successfully utilizing active tracks.");
            } catch (err) {
                console.error("[Recording] Failed to start mixed audio recording:", err);
            }
        } else {
            // Stop recording cleanly
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                recorderRef.current.stop();
                console.log("[Recording] Recording stopped.");
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        }
    }, [isRecording, localAudioTrack, agentAudioTrack, agentName]);

    return (
        <div className="flex-1 flex flex-col items-center justify-between py-6 px-4">
            {/* The Orb */}
            <div className="flex-1 flex items-center justify-center w-full">
                <OrbRanger
                    agentVolume={agentVolume || 0}
                    userVolume={userVolume || 0}
                    isConnected={isConnected}
                    isReconnecting={connectionState === ConnectionState.Reconnecting}
                    agentName={agentName}
                />
            </div>

            {/* Hint text */}
            <p className="text-center text-[11px] text-content/15 font-medium max-w-xs mb-4">
                {hint}
            </p>

            {/* Controls */}
            <ControlBar
                isMuted={isMuted}
                isRecording={isRecording}
                onToggleMute={onToggleMute}
                onToggleRecording={onToggleRecording}
                onHangUp={onHangUp}
            />
        </div>
    );
};
