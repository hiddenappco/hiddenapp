import { Language } from '../../types/core';
import { es } from '../../locales/es';
import { en } from '../../locales/en';
import type { TranslationType } from '../../locales/es';

const getLocale = (language: Language): TranslationType =>
    language === Language.English ? en : es;

export const getTempColor = (temp: number | null) => {
    if (temp === null) return 'text-gray-700';
    if (temp >= 18 && temp <= 26) return 'text-green-400';
    if (temp > 26) return 'text-orange-400';
    return 'text-blue-400';
};

export const getUVColor = (uv: number | null) => {
    if (uv === null) return 'text-gray-700';
    if (uv <= 2) return 'text-green-400';
    if (uv <= 5) return 'text-yellow-400';
    if (uv <= 7) return 'text-orange-500';
    return 'text-red-500';
};

export const getAQIColor = (aqi: number | null) => {
    if (aqi === null) return 'text-gray-700';
    if (aqi <= 50) return 'text-green-400';
    if (aqi <= 100) return 'text-yellow-400';
    return 'text-red-500';
};

const WEATHER_CODE_KEYS: Record<number, keyof TranslationType['environmental']['weather']> = {
    1000: 'clear',
    1100: 'mostlyClear',
    1101: 'partlyCloudy',
    1102: 'mostlyCloudy',
    1001: 'cloudy',
    2000: 'fog',
    2100: 'fog',
    4000: 'drizzle',
    4001: 'rain',
    4200: 'rain',
    4201: 'heavyRain',
    5000: 'snow',
    5001: 'snow',
    5100: 'snow',
    5101: 'snow',
    6000: 'freezingRain',
    6001: 'freezingRain',
    6200: 'freezingRain',
    6201: 'freezingRain',
    7000: 'icePellets',
    7101: 'icePellets',
    7102: 'icePellets',
    8000: 'thunderstorm',
};

export const getWeatherDescription = (code: number | null | undefined, language: Language) => {
    const weather = getLocale(language).environmental.weather;
    if (code === null || code === undefined) return weather.unknown;
    const key = WEATHER_CODE_KEYS[code];
    return key ? weather[key] : weather.unknown;
};

export const getWeatherIcon = (code: number | null | undefined) => {
    if (!code) return 'wb_sunny';
    if (code === 1000) return 'wb_sunny';
    if (code === 1100 || code === 1101) return 'partly_cloudy_day';
    if (code === 1102 || code === 1001) return 'cloud';
    if (code >= 4000 && code < 5000) return 'rainy';
    if (code >= 5000 && code < 6000) return 'ac_unit';
    if (code >= 8000) return 'thunderstorm';
    return 'cloud';
};

export const getLastUpdateText = (lastUpdate: any, language: Language) => {
    const lastUpdateLabels = getLocale(language).environmental.lastUpdate;
    if (!lastUpdate) return lastUpdateLabels.noData;
    try {
        const date = lastUpdate.toDate ? lastUpdate.toDate() : new Date(lastUpdate);
        if (isNaN(date.getTime())) return lastUpdateLabels.unknown;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return lastUpdateLabels.recent;
    }
};

export const getInterpretationBadge = (type: string, value: any, language: Language) => {
    if (value === null || value === undefined) return null;

    const badge = getLocale(language).environmental.badge;
    let label = "";
    let color = "text-content-muted border-gray-400/30";

    switch (type) {
        case 'temp':
            if (value < 15) { label = badge.temp.cold; color = "text-blue-400 border-blue-400/30"; }
            else if (value < 25) { label = badge.temp.mild; color = "text-green-400 border-green-400/30"; }
            else if (value < 32) { label = badge.temp.hot; color = "text-orange-400 border-orange-400/30"; }
            else { label = badge.temp.extreme; color = "text-red-500 border-red-500/30"; }
            break;
        case 'aqi':
            if (value <= 50) { label = badge.aqi.pure; color = "text-green-400 border-green-400/30"; }
            else if (value <= 100) { label = badge.aqi.moderate; color = "text-yellow-400 border-yellow-400/30"; }
            else { label = badge.aqi.alert; color = "text-red-500 border-red-500/30"; }
            break;
        case 'uv':
            if (value <= 2) { label = badge.uv.low; color = "text-green-400 border-green-400/30"; }
            else if (value <= 5) { label = badge.uv.moderate; color = "text-yellow-400 border-yellow-400/30"; }
            else if (value <= 7) { label = badge.uv.high; color = "text-orange-500 border-orange-500/30"; }
            else { label = badge.uv.extreme; color = "text-red-500 border-red-500/30"; }
            break;
        case 'rain':
            if (value === 0) { label = badge.rain.clear; color = "text-blue-300 border-blue-300/20"; }
            else if (value < 30) { label = badge.rain.veryLow; color = "text-blue-400 border-blue-400/30"; }
            else if (value < 60) { label = badge.rain.possible; color = "text-yellow-400 border-yellow-400/30"; }
            else if (value < 85) { label = badge.rain.high; color = "text-orange-400 border-orange-400/50"; }
            else if (value < 95) { label = badge.rain.veryHigh; color = "text-blue-500 border-blue-500/50"; }
            else { label = badge.rain.imminent; color = "text-indigo-500 border-indigo-500/70"; }
            break;
        case 'humidity':
            if (value < 40) { label = badge.humidity.dry; color = "text-orange-300 border-orange-300/30"; }
            else if (value < 70) { label = badge.humidity.ideal; color = "text-green-400 border-green-400/30"; }
            else { label = badge.humidity.humid; color = "text-cyan-400 border-cyan-400/30"; }
            break;
        case 'wind':
            if (value < 5) { label = badge.wind.calm; color = "text-content-muted border-gray-400/30"; }
            else if (value < 20) { label = badge.wind.breeze; color = "text-blue-300 border-blue-300/30"; }
            else { label = badge.wind.strong; color = "text-orange-400 border-orange-400/50"; }
            break;
        case 'elevation':
            if (value < 500) { label = badge.elevation.coast; color = "text-cyan-400 border-cyan-400/30"; }
            else if (value < 1500) { label = badge.elevation.valley; color = "text-green-400 border-green-400/30"; }
            else if (value < 3000) { label = badge.elevation.mountain; color = "text-orange-400 border-orange-400/30"; }
            else { label = badge.elevation.alpine; color = "text-blue-200 border-blue-200/30"; }
            break;
    }

    return { label, color };
};
