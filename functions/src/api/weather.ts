import fetch from "node-fetch";
import { ENV } from "../config/env";

export function mapAccuWeatherIcon(icon: number): number {
    if ([1, 2, 3, 30, 31, 33, 34].includes(icon)) return 1000; // Clear
    if ([4, 5, 35, 36].includes(icon)) return 1100; // Mostly Clear
    if ([6].includes(icon)) return 1101; // Partly Cloudy
    if ([7, 8, 38].includes(icon)) return 1001; // Cloudy
    if ([11, 37].includes(icon)) return 2000; // Fog
    if ([12, 13, 14, 39, 40].includes(icon)) return 4000; // Showers
    if ([15, 16, 17, 41, 42].includes(icon)) return 8000; // T-Storms
    if ([18].includes(icon)) return 4201; // Heavy Rain
    if ([22, 23, 24, 25, 26, 29, 43, 44].includes(icon)) return 5000; // Snow
    return 1001;
}

export async function getMarineData(lat: number, lng: number): Promise<any> {
    try {
        const stormglassKey = String(process.env.STORMGLASS_API_KEY || ENV.STORMGLASS_API_KEY).trim();
        const headers = { 'Authorization': stormglassKey };
        const now = new Date();
        const start = Math.floor(now.getTime() / 1000);
        const end = start + (48 * 60 * 60);

        const [waveRes, tideRes] = await Promise.all([
            fetch(`https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=waveHeight,wavePeriod,waterTemperature,currentSpeed&start=${start}&end=${start + 3600}`, { headers }),
            fetch(`https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}&start=${start}&end=${end}`, { headers })
        ]);
        
        console.log(`[Stormglass] WaveRes: ${waveRes.status}, TideRes: ${tideRes.status}`);
        if (!waveRes.ok || !tideRes.ok) {
            console.error(`[Stormglass] API Error. Wave: ${waveRes.status}, Tide: ${tideRes.status}`);
        }

        let waveHeight = null;
        let wavePeriod = null;
        let waterTemp = null;
        let currentSpeed = null;

        if (waveRes.ok) {
            const waveData = await waveRes.json();
            const hourData = waveData?.hours?.[0] || {};
            waveHeight = hourData.waveHeight?.sg ?? null;
            wavePeriod = hourData.wavePeriod?.sg ?? null;
            waterTemp = hourData.waterTemperature?.sg ?? null;
            currentSpeed = hourData.currentSpeed?.sg ?? null;
        }

        let currentStatus = "Estable";
        let nextHighTide = null;
        let nextLowTide = null;
        let nextEvent = null;
        let tomorrow: { nextHighTide: string | null, nextLowTide: string | null } = { nextHighTide: null, nextLowTide: null };

        if (tideRes.ok) {
            const tideData = await tideRes.json();
            const extremes = tideData?.data || [];

            const upcoming = extremes.filter((e: any) => new Date(e.time).getTime() > now.getTime());
            if (upcoming.length > 0) {
                const veryNext = upcoming[0];
                currentStatus = veryNext.type === "high" ? "Subiendo" : "Bajando";
                nextEvent = {
                    type: veryNext.type,
                    time: new Date(veryNext.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })
                };

                const highToday = upcoming.find((e: any) => e.type === "high");
                if (highToday) nextHighTide = new Date(highToday.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

                const lowToday = upcoming.find((e: any) => e.type === "low");
                if (lowToday) nextLowTide = new Date(lowToday.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

                const tomorrowStart = now.getTime() + (24 * 60 * 60 * 1000);
                const highTomorrow = upcoming.find((e: any) => e.type === "high" && new Date(e.time).getTime() > tomorrowStart);
                if (highTomorrow) tomorrow.nextHighTide = new Date(highTomorrow.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

                const lowTomorrow = upcoming.find((e: any) => e.type === "low" && new Date(e.time).getTime() > tomorrowStart);
                if (lowTomorrow) tomorrow.nextLowTide = new Date(lowTomorrow.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
            }
        }

        return {
            waveHeight: waveHeight !== null ? Number(waveHeight.toFixed(2)) : null,
            wavePeriod: wavePeriod !== null ? Number(wavePeriod.toFixed(1)) : null,
            waterTemp: waterTemp !== null ? Number(waterTemp.toFixed(1)) : null,
            currentSpeed: currentSpeed !== null ? Number((currentSpeed * 3.6).toFixed(1)) : null,
            currentStatus,
            nextHighTide,
            nextLowTide,
            nextEvent,
            tomorrow
        };
    } catch (e) {
        console.error("[Stormglass] Error fetching marine data:", e);
        return null;
    }
}

export async function getWeatherData(lat: number, lng: number) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const apiKey = String(ENV.ACCUWEATHER_API_KEY).trim();

        const geoUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${apiKey}&q=${lat},${lng}`;
        const geoRes = await fetch(geoUrl, { signal: controller.signal as any });
        if (!geoRes.ok) throw new Error("AccuWeather Geo API Error");
        const geoData = await geoRes.json();
        const locationKey = geoData.Key;

        if (!locationKey) throw new Error("No Location Key found");

        const [currRes, hourlyRes, dailyRes] = await Promise.all([
            fetch(`https://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${apiKey}&details=true&language=es-es`, { signal: controller.signal as any }),
            fetch(`https://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${locationKey}?apikey=${apiKey}&details=true&metric=true&language=es-es`, { signal: controller.signal as any }),
            fetch(`https://dataservice.accuweather.com/forecasts/v1/daily/5day/${locationKey}?apikey=${apiKey}&details=true&metric=true&language=es-es`, { signal: controller.signal as any })
        ]);

        clearTimeout(timeout);

        if (!currRes.ok || !hourlyRes.ok || !dailyRes.ok) {
            console.error(`[AccuWeather] API Error. Current: ${currRes.status}, Hourly: ${hourlyRes.status}, Daily: ${dailyRes.status}`);
            return null;
        }

        const currArray = await currRes.json();
        const hourlyData = await hourlyRes.json();
        const dailyData = await dailyRes.json();

        const current = currArray[0] || {};
        const dailyForecasts = dailyData.DailyForecasts || [];
        const todayForecast = dailyForecasts[0] || {};
        const tomorrowForecast = dailyForecasts[1] || {};

        const temp = current.Temperature?.Metric?.Value ?? 0;
        const feelsLike = current.RealFeelTemperature?.Metric?.Value ?? temp;
        const humidity = current.RelativeHumidity ?? 0;
        const wind = current.Wind?.Speed?.Metric?.Value ?? 0;
        const gust = current.WindGust?.Speed?.Metric?.Value ?? 0;
        const visibility = current.Visibility?.Metric?.Value ?? 10;
        const pressure = current.Pressure?.Metric?.Value ?? 1013;
        const dewPoint = current.DewPoint?.Metric?.Value ?? null;
        const cloudCover = current.CloudCover ?? 0;
        const uvIndex = current.UVIndex ?? 0;
        const precip1hr = current.PrecipitationSummary?.PastHour?.Metric?.Value ?? 0;

        let extractedAqi = null;
        if (todayForecast.AirAndPollen) {
            const airQualityNode = todayForecast.AirAndPollen.find((node: any) => node.Name === 'AirQuality');
            if (airQualityNode) extractedAqi = airQualityNode.Value;
        }

        const hourlyRain = hourlyData.map((h: any) => h.PrecipitationProbability ?? 0);
        const hourlyTemp = hourlyData.map((h: any) => h.Temperature?.Value ?? temp);
        const hourlyWind = hourlyData.map((h: any) => h.Wind?.Speed?.Value ?? wind);
        const hourlyDewPoint = hourlyData.map((h: any) => h.DewPoint?.Value ?? null);
        const hourlyRealFeel = hourlyData.map((h: any) => h.RealFeelTemperature?.Value ?? null);

        return {
            temperature: { value: temp },
            feelsLike: { value: feelsLike },
            humidity: humidity,
            conditionText: current.WeatherText || null,
            precipitation: {
                probability: hourlyData[0]?.PrecipitationProbability ?? 0,
                amount: precip1hr,
                hourly: hourlyRain
            },
            pressure: pressure,
            wind: {
                speed: { value: wind },
                gust: gust
            },
            visibility: visibility,
            cloudCover: cloudCover,
            cloudCeiling: current.Ceiling?.Metric?.Value ?? null,
            dewPoint: dewPoint,
            uvIndex: uvIndex,
            weatherCode: mapAccuWeatherIcon(current.WeatherIcon),
            forecast12h: {
                rain: hourlyRain,
                temp: hourlyTemp,
                wind: hourlyWind,
                dewPoint: hourlyDewPoint,
                realFeel: hourlyRealFeel
            },
            aqi: extractedAqi,
            hourly: {
                temp: hourlyTemp,
                wind: hourlyWind
            },
            daily: {
                sunrise: todayForecast.Sun?.EpochRise ? new Date(todayForecast.Sun.EpochRise * 1000).toISOString() : null,
                sunset: todayForecast.Sun?.EpochSet ? new Date(todayForecast.Sun.EpochSet * 1000).toISOString() : null,
                tomorrow: {
                    tempMax: tomorrowForecast.Temperature?.Maximum?.Value ?? null,
                    tempMin: tomorrowForecast.Temperature?.Minimum?.Value ?? null,
                    rainProb: tomorrowForecast.Day?.PrecipitationProbability ?? 0,
                    rainVol: tomorrowForecast.Day?.TotalLiquid?.Value ?? 0,
                    rainHours: tomorrowForecast.Day?.HoursOfPrecipitation ?? 0,
                    phrase: tomorrowForecast.Day?.LongPhrase ?? tomorrowForecast.Day?.ShortPhrase ?? "Clima estable",
                    weatherCode: mapAccuWeatherIcon(tomorrowForecast.Day?.Icon ?? 1),
                    avgCloudCover: tomorrowForecast.Day?.CloudCover ?? 0,
                    details: tomorrowForecast
                }
            }
        };
    } catch (e) {
        console.error("AccuWeather API Error:", e);
        return null;
    }
}

export async function getGoogleAirQuality(lat: number, lng: number) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); 

        const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${ENV.GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            signal: controller.signal as any,
            body: JSON.stringify({
                location: {
                    latitude: lat,
                    longitude: lng
                }
            })
        });
        clearTimeout(timeout);
        if (!response.ok) {
            const err = await response.text();
            console.warn(`Google AQI API Non-OK Response for [${lat}, ${lng}]: Status ${response.status}`, err);
            return null;
        }
        const result = await response.json();
        if (!result.indexes || result.indexes.length === 0) {
            console.warn(`Google AQI: No data indexes returned for coordinates [${lat}, ${lng}]`);
            return null;
        }
        return result.indexes[0].aqi;
    } catch (e) {
        console.error("Google AQI API Error:", e);
        return null;
    }
}

export async function getOpenMeteoAirQuality(lat: number, lng: number) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi`;
        const response = await fetch(url, { signal: controller.signal as any });
        clearTimeout(timeout);
        if (!response.ok) return null;
        const data = await response.json();
        return data.current?.us_aqi ?? null;
    } catch (e) {
        console.error("Open-Meteo Air Quality Error:", e);
        return null;
    }
}

export async function getOpenMeteoCloudCover(lat: number, lng: number) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=cloud_cover`;
        const response = await fetch(url, { signal: controller.signal as any });
        clearTimeout(timeout);
        if (!response.ok) return null;
        const data = await response.json();
        return data.current?.cloud_cover ?? null;
    } catch (e) {
        console.error("Open-Meteo Cloud Cover Error:", e);
        return null;
    }
}

export async function getElevationData(lat: number, lng: number) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); 

        const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`;
        const response = await fetch(url, { signal: controller.signal as any });
        clearTimeout(timeout);

        if (!response.ok) return null;
        const data = await response.json();

        if (data && data.elevation && data.elevation.length > 0) {
            console.log(`[Elevation] Data fetched for ${lat},${lng}: ${data.elevation[0]}m`);
            return Math.round(data.elevation[0]);
        }
        return null;
    } catch (e) {
        console.error("Open-Meteo Elevation API Error:", e);
        return null;
    }
}
