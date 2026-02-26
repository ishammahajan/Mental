import React, { useState, useEffect, useRef } from 'react';
import { CloudRain, Wind, Sun, Droplets, Cloud, Snowflake, CloudFog, Loader, MapPin, RefreshCw } from 'lucide-react';
import { getWeatherData } from '../services/weatherService';
import { getAIWeatherSuggestion } from '../services/geminiService';
import { WeatherData } from '../types';

interface Props {
  variant: 'student' | 'counselor';
}

const WeatherIcon = ({ condition, size = 24 }: { condition: string; size?: number }) => {
  const c = condition.toLowerCase();
  if (c.includes('rain')) return <CloudRain className="text-[#8A9A5B]" size={size} />;
  if (c.includes('clouds')) return <Cloud className="text-[#8A9A5B]" size={size} />;
  if (c.includes('snow')) return <Snowflake className="text-[#8A9A5B]" size={size} />;
  if (c.includes('haze') || c.includes('mist') || c.includes('fog')) return <CloudFog className="text-[#8A9A5B]" size={size} />;
  return <Sun className="text-[#8A9A5B]" size={size} />;
};

const AQI_LEVELS = {
  1: { label: 'Good', color: 'text-green-600' },
  2: { label: 'Moderate', color: 'text-yellow-600' },
  3: { label: 'Unhealthy*', color: 'text-orange-500' },
  4: { label: 'Unhealthy', color: 'text-red-600 font-bold' },
  5: { label: 'Hazardous', color: 'text-red-700 font-extrabold' },
};

const EnvironmentWidget: React.FC<Props> = ({ variant }) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string>("How's the weather in your world?");
  const [denied, setDenied] = useState(false);

  const fetchEnvData = () => {
    setLoading(true);
    setError(null);
    setDenied(false);

    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const weatherData = await getWeatherData(position.coords.latitude, position.coords.longitude);
          setData(weatherData);
          const aiSuggestion = await getAIWeatherSuggestion(weatherData);
          setSuggestion(aiSuggestion);
        } catch (err) {
          setError('Could not fetch weather data.');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        if (err.code === 1) { // PERMISSION_DENIED
          setDenied(true);
          setError('Location access denied.');
        } else {
          setError('Unable to determine location.');
        }
        setLoading(false);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => {
    fetchEnvData();
    const interval = setInterval(fetchEnvData, 3600000); // refresh every hour
    return () => clearInterval(interval);
  }, []);

  // Counselor Variant (Slim Header Bar)
  if (variant === 'counselor') {
    return (
      <div className="bg-white border-b border-gray-200 px-8 py-2 flex justify-between items-center text-xs text-slate-500">
        <div className="flex gap-4 items-center">
          {loading ? (
            <span className="flex items-center gap-1 animate-pulse"><Loader size={12} className="animate-spin" /> Fetching location...</span>
          ) : error ? (
            <span className="flex items-center gap-2 text-orange-500">
              <MapPin size={12} /> {denied ? 'Location blocked — ' : ''}{error}
              <button onClick={fetchEnvData} className="flex items-center gap-1 text-blue-500 hover:text-blue-700 underline">
                <RefreshCw size={10} /> Retry
              </button>
            </span>
          ) : data ? (
            <>
              <span className="flex items-center gap-1"><MapPin size={12} /> {data.location}</span>
              <span className="flex items-center gap-1"><Sun size={12} /> {data.temp}°C</span>
              <WeatherIcon condition={data.condition} size={12} />
              <span className={`font-bold ${AQI_LEVELS[data.aqi as keyof typeof AQI_LEVELS]?.color || ''}`}>
                AQI: {AQI_LEVELS[data.aqi as keyof typeof AQI_LEVELS]?.label}
              </span>
            </>
          ) : null}
        </div>
        <div className="italic">{suggestion}</div>
      </div>
    );
  }

  // Student Variant (Neumorphic Card)
  return (
    <div className="neu-flat p-4 rounded-2xl mb-6 flex items-center justify-between min-h-[100px]">
      {loading && (
        <div className="flex items-center justify-center gap-2 w-full text-sm text-slate-400">
          <Loader size={16} className="animate-spin" /> Loading local vibe...
        </div>
      )}
      {error && !loading && (
        <div className="flex flex-col items-center w-full gap-2 text-center text-sm text-orange-600">
          <span>{error}</span>
          <button onClick={fetchEnvData} className="flex items-center gap-1 text-xs text-[#8A9A5B] hover:underline">
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      )}
      {data && !loading && !error && (
        <>
          <div>
            <div className="text-xs text-[#708090]/60 uppercase tracking-wider mb-1">{data.location}</div>
            <div className="flex items-center gap-2">
              <WeatherIcon condition={data.condition} />
              <span className="text-2xl font-bold text-[#708090]">{data.temp}°C</span>
            </div>
            <div className={`text-xs mt-1 ${AQI_LEVELS[data.aqi as keyof typeof AQI_LEVELS]?.color || 'text-[#CC5500]'}`}>
              AQI • {AQI_LEVELS[data.aqi as keyof typeof AQI_LEVELS]?.label || 'Unknown'}
            </div>
          </div>
          <div className="text-right max-w-[55%]">
            <p className="text-sm font-bold text-[#8A9A5B] leading-snug">{suggestion}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default EnvironmentWidget;