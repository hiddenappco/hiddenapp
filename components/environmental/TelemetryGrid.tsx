import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { 
    getTempColor, 
    getAQIColor, 
    getUVColor, 
    getInterpretationBadge, 
    getWeatherDescription, 
    getWeatherIcon 
} from './environmentalUtils';

interface TelemetryGridProps {
    selectedId: string;
    envData: any;
    loadingEnv: boolean;
}

export const TelemetryGrid: React.FC<TelemetryGridProps> = ({
    selectedId,
    envData,
    loadingEnv
}) => {
    const { t, language } = useTranslation();
    const renderBadge = (type: string, value: any) => {
        const result = getInterpretationBadge(type, value, language);
        if (!result) return null;
        return (
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${result.color} font-black uppercase tracking-tighter ml-auto`}>
                {result.label}
            </span>
        );
    };

    return (
        <div className={`flex flex-col gap-3 transition-opacity duration-300 ${loadingEnv ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
            {/* Primary Metrics */}
            <div className="grid grid-cols-2 gap-3">
                {/* Temperature */}
                <div className="bg-overlay/5 border border-overlay/10 rounded-xl p-3 flex flex-col justify-between min-h-[105px]">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] uppercase text-content-muted tracking-wider font-bold">{t('environmental.temperature')}</p>
                        {renderBadge('temp', envData?.temp)}
                    </div>
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className={`text-4xl font-bold font-display ${selectedId && envData && envData.temp !== null ? getTempColor(envData.temp) : 'text-content-subtle'}`}>
                                {selectedId && envData && envData.temp !== null ? envData.temp : '--'}°
                            </span>
                            <span className="text-[10px] text-content-muted mt-1 font-bold uppercase truncate">
                                {selectedId && envData && envData.feelsLike !== null ? `${t('environmental.feelsLike')}: ${envData.feelsLike}°` : '--'}
                            </span>
                        </div>
                        <span className={`material-symbols-outlined text-3xl opacity-80 ${selectedId && envData ? getTempColor(envData.temp) : 'text-content-subtle'}`}>thermostat</span>
                    </div>
                </div>

                {/* AQI */}
                <div className="bg-overlay/5 border border-overlay/10 rounded-xl p-3 flex flex-col justify-between min-h-[105px] relative overflow-hidden">
                    <div className="flex items-center gap-2 relative z-10">
                        <p className="text-[10px] uppercase text-content-muted tracking-wider font-bold">{t('environmental.airQuality')}</p>
                        {renderBadge('aqi', envData?.aqi)}
                    </div>
                    {selectedId && envData && envData.aqi !== null ? (
                        <div className="flex justify-between items-end relative z-10">
                            <div className="flex flex-col">
                                <span className={`text-4xl font-bold font-display ${getAQIColor(envData.aqi)}`}>
                                    {envData.aqi}
                                </span>
                                <p className={`text-[10px] mt-1 uppercase font-bold tracking-tight ${getAQIColor(envData.aqi)}`}>
                                    {envData.aqi <= 50 ? t('environmental.healthy') : (envData.aqi <= 100 ? t('environmental.moderate') : t('environmental.alert'))}
                                </p>
                            </div>
                            <span className={`material-symbols-outlined text-3xl ${getAQIColor(envData.aqi)}`}>air</span>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-3 text-center bg-black/40">
                            <p className="text-[9px] text-content-subtle uppercase tracking-widest font-black opacity-40">
                                {t('environmental.noData')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Precipitation (Full Width) */}
            <div className="bg-overlay/5 border border-overlay/10 rounded-xl p-3.5 flex flex-col justify-between min-h-[120px] relative overflow-hidden">
                <div className="flex items-center gap-2">
                    <p className="text-[10px] uppercase text-content-muted tracking-wider font-bold">{t('environmental.precipitation')}</p>
                    {renderBadge('rain', envData?.rainProb)}
                </div>
                
                <div className="flex justify-between items-center mt-3 z-10">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-2">
                            <span className={`text-4xl font-bold font-display ${selectedId && envData && envData.rainProb !== null ? (envData.rainProb > 50 ? 'text-blue-400' : 'text-content-secondary') : 'text-content-subtle'}`}>
                                {selectedId && envData && envData.rainProb !== null ? `${envData.rainProb}%` : '--'}
                            </span>
                            {selectedId && envData && envData.rainVol !== undefined && (
                                <span className="text-sm font-bold text-blue-300/80">
                                    {envData.rainVol} <span className="text-[10px]">mm</span>
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] font-bold text-content-muted uppercase tracking-wide">
                            {selectedId && envData ? getWeatherDescription(envData.weatherCode, language) : '--'}
                        </span>
                    </div>
                    <span className={`material-symbols-outlined text-5xl opacity-80 ${selectedId && envData && envData.rainProb > 50 ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-content-subtle'}`}>
                        {envData && envData.weatherCode === 0 ? 'clear_day' : (envData?.weatherCode === 95 ? 'thunderstorm' : 'rainy')}
                    </span>
                </div>

                {/* 4-Hour Timeline */}
                {selectedId && envData?.hourly?.rain && envData.hourly.rain.length >= 4 && (
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-overlay/10 z-10">
                        {[1, 2, 3, 4].map((offset) => {
                            const prob = envData.hourly!.rain[offset];
                            const now = new Date();
                            const t = new Date(now.getTime() + offset * 60 * 60 * 1000);
                            const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':00', '');
                            return (
                                <div key={offset} className="flex flex-col items-center">
                                    <span className="text-[9px] text-content-subtle font-bold mb-1">{timeStr}</span>
                                    <span className={`text-[10px] font-black ${prob > 40 ? 'text-blue-400' : 'text-content-muted'}`}>{prob}%</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-overlay/5">
                    <div 
                        className={`h-full transition-all duration-1000 ${envData?.rainVol && envData.rainVol > 5 ? 'bg-red-500/60' : 'bg-blue-500/40'}`}
                        style={{ width: `${envData?.rainProb || 0}%` }}
                    ></div>
                </div>
            </div>

            {/* Secondary Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
                {/* UV Index */}
                <div className="bg-overlay/5 border border-overlay/10 rounded-xl p-2.5 flex flex-col justify-between min-h-[85px]">
                    <div className="flex items-center gap-1">
                        <p className="text-[9px] uppercase text-content-muted tracking-wider font-bold truncate">U.V.</p>
                        {renderBadge('uv', envData?.uvIndex)}
                    </div>
                    <div className="flex items-end justify-between">
                        <span className={`text-2xl font-bold font-display ${selectedId && envData && envData.uvIndex !== null ? getUVColor(envData.uvIndex) : 'text-content-subtle'}`}>
                            {selectedId && envData && envData.uvIndex !== null ? envData.uvIndex : '--'}
                        </span>
                        <span className="material-symbols-outlined text-xl text-orange-400 opacity-80">light_mode</span>
                    </div>
                </div>

                {/* Humidity */}
                <div className="bg-overlay/5 border border-overlay/10 rounded-xl p-3 flex flex-col justify-between min-h-[85px]">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] uppercase text-content-muted font-bold">Hum.</p>
                        {renderBadge('humidity', envData?.humidity)}
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-bold font-display text-cyan-400">{selectedId && envData && envData.humidity !== null ? envData.humidity : '--'}%</span>
                            <span className="material-symbols-outlined text-sm text-cyan-500">water_drop</span>
                        </div>
                        <div className="text-[8px] text-content-subtle font-bold uppercase mt-1">
                            {t('environmental.dewPoint')} {selectedId && envData && envData.dewPoint !== null ? envData.dewPoint : '--'}°
                        </div>
                    </div>
                </div>

                {/* Wind */}
                <div className="bg-overlay/5 border border-overlay/10 rounded-xl p-3 flex flex-col justify-between min-h-[85px]">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] uppercase text-content-muted font-bold">{t('environmental.wind')}</p>
                        {renderBadge('wind', envData?.windSpeed)}
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-bold font-display text-content">{selectedId && envData && envData.windSpeed !== null ? Math.round(envData.windSpeed) : '--'}</span>
                            <span className="text-[9px] font-bold text-content-muted">KM/H</span>
                        </div>
                        <div className="text-[8px] text-content-subtle font-bold uppercase mt-1 truncate">
                            {t('environmental.gusts')} {selectedId && envData && envData.windGust !== null ? Math.round(envData.windGust) : '--'}
                        </div>
                    </div>
                </div>
                
                {/* Visibility */}
                <div className="bg-overlay/5 border border-overlay/10 rounded-xl p-2.5 flex flex-col justify-between min-h-[85px]">
                    <div className="flex items-center gap-1">
                        <p className="text-[9px] uppercase text-content-muted tracking-wider font-bold truncate">{t('environmental.visibility')}</p>
                        {((v) => {
                            if (!v) return null;
                            let l = v < 2 ? t('environmental.visLow') : v < 8 ? t('environmental.visMid') : t('environmental.visClear');
                            let c = v < 2 ? "text-red-400 border-red-400/20" : v < 8 ? "text-yellow-400 border-yellow-400/20" : "text-green-400 border-green-400/20";
                            return <span className={`text-[8px] px-1 py-0.5 rounded-full border ${c} font-black uppercase ml-auto`}>{l}</span>;
                        })(envData?.visibility)}
                    </div>
                    <div className="flex items-end justify-between">
                        <span className={`text-2xl font-bold font-display ${selectedId && envData && envData.visibility !== null ? 'text-content' : 'text-content-subtle'}`}>
                            {selectedId && envData && envData.visibility !== null ? envData.visibility.toFixed(1) : '--'}
                        </span>
                        <span className="text-[9px] text-content-subtle font-bold ml-0.5 tracking-tighter">KM</span>
                    </div>
                </div>

                {/* Elevation */}
                <div className="bg-overlay/5 border border-overlay/10 rounded-xl p-3 flex flex-col justify-between min-h-[85px] relative overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                        <p className="text-[9px] uppercase text-content-muted font-bold">{t('environmental.elevation')}</p>
                        {renderBadge('elevation', envData?.elevation)}
                    </div>
                    <div className="flex items-baseline gap-1 mt-1 relative z-10">
                        <span className="text-xl font-bold font-display text-green-400">{selectedId && envData && envData.elevation !== null ? Math.round(envData.elevation) : '--'}</span>
                        <span className="text-[8px] font-bold text-content-muted">MSNM</span>
                    </div>
                </div>

                {/* Cloud Cover */}
                <div className="bg-overlay/5 border border-overlay/10 rounded-xl p-3 flex flex-col justify-between min-h-[85px]">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] uppercase text-content-muted font-bold">{t('environmental.skies')}</p>
                        <span className="material-symbols-outlined text-sm text-content-muted">cloud</span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1 overflow-hidden">
                        <span className="text-xl font-bold font-display text-content-secondary whitespace-nowrap">
                            {selectedId && envData && envData.cloudCover !== null ? Math.round(envData.cloudCover) : '--'}%
                        </span>
                    </div>
                </div>

                {/* Tomorrow (2 Cols) */}
                <div className="col-span-2 bg-overlay/5 border border-overlay/10 rounded-xl p-3 flex items-center justify-between min-h-[85px] relative overflow-hidden group">
                    <div className="flex flex-col justify-center h-full relative z-10 w-[70%]">
                        <p className="text-[10px] uppercase text-orange-400 font-bold tracking-widest leading-none mb-1">{t('environmental.tomorrow')}</p>
                        <span className="text-[10px] font-medium text-content-secondary leading-[13px]">
                            {envData?.daily?.tomorrow?.phrase || t('environmental.stableWeather')}
                        </span>
                    </div>
                    <div className="flex flex-col items-end justify-center relative z-10 w-[30%]">
                        <span className="text-3xl font-bold font-display text-orange-300">
                            {envData?.daily?.tomorrow?.tempMax ? `${Math.round(envData.daily.tomorrow.tempMax)}°` : '--'}
                        </span>
                        <span className="text-[10px] font-bold text-blue-400">
                            {envData?.daily?.tomorrow?.rainProb ?? 0}%
                        </span>
                    </div>
                </div>

                {/* Solar Cycle */}
                <div className="bg-overlay/5 border border-overlay/10 rounded-xl p-3 flex flex-col justify-between min-h-[85px]">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] uppercase text-content-muted font-bold">{t('environmental.solarCycle')}</p>
                        <span className="material-symbols-outlined text-sm text-yellow-500/50">wb_twilight</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-orange-400/80">light_mode</span>
                            <span className="text-[10px] font-bold text-content">
                                {envData?.daily?.sunrise ? new Date(envData.daily.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px] text-blue-300/80">nightlight</span>
                            <span className="text-[10px] font-bold text-content">
                                {envData?.daily?.sunset ? new Date(envData.daily.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Oceanographic Module */}
            {envData?.marine && (
                <OceanographicModule data={envData.marine} />
            )}
        </div>
    );
};

const OceanographicModule: React.FC<{ data: any }> = ({ data }) => {
    const { t } = useTranslation();
    const nextEventTime = data.nextEvent?.time || '--:--';
    const isHigh = data.nextEvent?.type === 'high';
    const statusLabel = data.currentStatus?.toUpperCase() || 'ESTABLE';
    
    return (
        <div className="bg-gradient-to-b from-blue-50/50 via-cyan-50/30 to-white dark:from-[#0F172A] dark:via-[#0A1118] dark:to-black border border-blue-500/20 rounded-[2rem] p-5 flex flex-col gap-4 relative overflow-hidden mt-2 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between relative z-10 border-b border-overlay/5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                        <span className="material-symbols-outlined text-blue-400 text-xl">tsunami</span>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[10px] uppercase text-blue-400/60 font-black tracking-[0.2em] leading-none mb-1">
                            {t('environmental.monitor')}
                        </p>
                        <p className="text-[14px] uppercase text-content font-black tracking-wider leading-none">
                            {t('environmental.oceanSystem')}
                        </p>
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-md ${data.currentStatus === 'Subiendo' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${data.currentStatus === 'Subiendo' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">{statusLabel}</span>
                </div>
            </div>

            {/* Main Metrics */}
            <div className="grid grid-cols-3 gap-2.5 relative z-10">
                <div className="bg-white/[0.03] border border-overlay/5 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-sm shadow-inner group transition-colors">
                    <span className="material-symbols-outlined text-blue-400/80 text-lg mb-1.5">waves</span>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-bold font-display text-content">{data.waveHeight ?? '--'}</span>
                        <span className="text-[9px] text-content-subtle font-bold uppercase">m</span>
                    </div>
                    <p className="text-[8px] uppercase font-black text-content-subtle mt-1.5 tracking-widest">{t('environmental.waves')}</p>
                </div>

                <div className="bg-white/[0.03] border border-overlay/5 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-sm shadow-inner group transition-colors">
                    <span className="material-symbols-outlined text-orange-400/80 text-lg mb-1.5">thermostat</span>
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-bold font-display text-content">{data.waterTemp ?? '--'}</span>
                        <span className="text-[9px] text-content-subtle font-bold uppercase">°C</span>
                    </div>
                    <p className="text-[8px] uppercase font-black text-content-subtle mt-1.5 tracking-widest">{t('environmental.waterTemp')}</p>
                </div>

                <div className="bg-white/[0.03] border border-overlay/5 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-sm shadow-inner group transition-colors">
                    <span className="material-symbols-outlined text-blue-300/80 text-lg mb-1.5">schedule</span>
                    <span className="text-[16px] font-bold text-blue-800 dark:text-blue-100">{nextEventTime}</span>
                    <p className="text-[7px] uppercase font-black text-blue-400/60 mt-1.5 text-center leading-tight tracking-widest">
                        {isHigh ? t('environmental.nextHighTide') : t('environmental.nextLowTide')}
                    </p>
                </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 gap-2.5 relative z-10">
                <div className="bg-white/[0.02] border border-overlay/5 rounded-xl px-3 py-2 flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-content-muted text-[16px]">timer</span>
                        <span className="text-[8px] font-black text-content-subtle uppercase tracking-widest">{t('environmental.period')}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[11px] font-bold text-content">{data.wavePeriod ?? '--'}</span>
                        <span className="text-[7px] font-bold text-content-muted uppercase whitespace-nowrap">s</span>
                    </div>
                </div>
                <div className="bg-white/[0.02] border border-overlay/5 rounded-xl px-3 py-2 flex items-center justify-between shadow-inner overflow-hidden">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-content-muted text-[16px]">explore</span>
                        <span className="text-[8px] font-black text-content-subtle uppercase tracking-widest">{t('environmental.current')}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[11px] font-bold text-content">{data.currentSpeed ?? '--'}</span>
                        <span className="text-[7px] font-bold text-content-muted uppercase whitespace-nowrap">km/h</span>
                    </div>
                </div>
            </div>

            {/* Tide Progress Bar */}
            <div className="flex flex-col gap-3 mt-1 relative z-10 bg-white/[0.02] border border-overlay/5 rounded-2xl p-4 shadow-inner">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-content-subtle uppercase tracking-[0.2em]">{t('environmental.lowTide')}</span>
                    <div className="h-[1px] flex-1 mx-4 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-[0.2em]">{t('environmental.highTide')}</span>
                </div>
                
                <div className="h-2 w-full bg-blue-900/20 rounded-full relative overflow-hidden border border-overlay/5">
                    <div 
                        className="h-full bg-gradient-to-r from-cyan-600 via-blue-500 to-indigo-600 rounded-full transition-all duration-1500 ease-out shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                        style={{ width: data.currentStatus === 'Subiendo' ? '70%' : '30%' }}
                    ></div>
                    <div className="absolute top-0 left-1/2 w-[1px] h-full bg-overlay/10"></div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-content leading-none mb-1">{data.nextLowTide || '--:--'}</span>
                        <span className="text-content-muted text-[7px] font-black uppercase tracking-tighter">{t('environmental.todayLow')}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black text-blue-300/90 leading-none mb-1">{data.tomorrow?.nextLowTide || '--:--'}</span>
                        <span className="text-content-subtle text-[7px] font-black uppercase tracking-tighter">{t('environmental.tomorrowLow')}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black text-blue-300/90 leading-none mb-1">{data.tomorrow?.nextHighTide || '--:--'}</span>
                        <span className="text-content-subtle text-[7px] font-black uppercase tracking-tighter">{t('environmental.tomorrowHigh')}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black text-content leading-none mb-1">{data.nextHighTide || '--:--'}</span>
                        <span className="text-content-muted text-[7px] font-black uppercase tracking-tighter">{t('environmental.todayHigh')}</span>
                    </div>
                </div>
            </div>

            {/* Background Decorative Element */}
            <div className="absolute -right-6 -bottom-6 opacity-[0.02] pointer-events-none">
                <span className="material-symbols-outlined text-[160px] text-blue-500">water</span>
            </div>
        </div>
    );
};
