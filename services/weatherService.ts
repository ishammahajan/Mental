import { WeatherData } from '../types';

// WMO Weather interpretation codes mapping to simplified conditions for icons
const WMO_CODES: { [key: number]: string } = {
    0: 'Clear', 1: 'Clear', 2: 'Clouds', 3: 'Clouds',
    45: 'Fog', 48: 'Fog',
    51: 'Rain', 53: 'Rain', 55: 'Rain', 56: 'Rain', 57: 'Rain',
    61: 'Rain', 63: 'Rain', 65: 'Rain', 66: 'Rain', 67: 'Rain',
    71: 'Snow', 73: 'Snow', 75: 'Snow', 77: 'Snow',
    80: 'Rain', 81: 'Rain', 82: 'Rain', 85: 'Snow', 86: 'Snow',
    95: 'Rain', 96: 'Rain', 99: 'Rain',
};

/**
 * Converts the Open-Meteo US AQI value (0-500 scale) into our 1-5 display level.
 * US AQI scale:
 *   0-50   → Good (1)
 *   51-100 → Moderate (2)
 *   101-150 → Unhealthy for Sensitive Groups (3)
 *   151-200 → Unhealthy (4)
 *   201+   → Very Unhealthy / Hazardous (5)
 */
const getAqiLevel = (usAqi: number | null): number => {
    if (usAqi === null || usAqi < 0) return 1; // Default to Good
    if (usAqi <= 50) return 1;
    if (usAqi <= 100) return 2;
    if (usAqi <= 150) return 3;
    if (usAqi <= 200) return 4;
    return 5;
};

export const getWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
    // Fetch weather data
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    // Fetch Air Quality strictly using us_aqi from hourly since current brings errors on some regions
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi`;

    // Reverse Geocoding
    const locationUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;

    // Execute concurrently
    const [weatherRes, locationRes] = await Promise.all([
        fetch(weatherUrl),
        fetch(locationUrl, { headers: { 'User-Agent': 'SPeakUp/1.0 (spjimr.org)' } }),
    ]);

    if (!weatherRes.ok) throw new Error(`Weather fetch failed: ${weatherRes.status}`);
    if (!locationRes.ok) throw new Error(`Location fetch failed: ${locationRes.status}`);

    const weatherData = await weatherRes.json();
    const locationData = await locationRes.json();

    let aqiLevel = 1;
    try {
        const aqiRes = await fetch(aqiUrl);
        if (aqiRes.ok) {
            const aqiData = await aqiRes.json();
            // Get the AQI for the current hour
            const currentHour = new Date().toISOString().slice(0, 13) + ":00";
            const timeIndex = aqiData?.hourly?.time?.findIndex((t: string) => t.startsWith(currentHour));

            if (timeIndex !== undefined && timeIndex !== -1) {
                const rawAqi = aqiData.hourly.us_aqi[timeIndex];
                aqiLevel = getAqiLevel(rawAqi);
            } else if (aqiData?.hourly?.us_aqi?.length > 0) {
                // Fallback to the first available data point
                aqiLevel = getAqiLevel(aqiData.hourly.us_aqi[0]);
            }
        }
    } catch (aqiErr) {
        console.warn('AQI fetch failed, defaulting to Good:', aqiErr);
    }

    const addr = locationData.address || {};
    const locationName = `${addr.suburb || addr.city_district || addr.city || addr.town || 'Unknown'}, ${addr.state || ''}`.trim().replace(/,\s*$/, '');
    const cityName = addr.city || addr.town || addr.state_district || addr.suburb || 'Unknown';

    return {
        location: locationName.toUpperCase(),
        city: cityName,
        temp: Math.round(weatherData.current_weather.temperature),
        condition: WMO_CODES[weatherData.current_weather.weathercode as keyof typeof WMO_CODES] || 'Clear',
        aqi: aqiLevel,
    };
};
