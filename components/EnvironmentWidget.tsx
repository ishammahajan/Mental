import React, { useState, useEffect } from 'react';
import { CloudRain, Wind, Sun, Droplets, Cloud, Snowflake, CloudFog, Loader, MapPin } from 'lucide-react';
import { getWeatherData } from '../services/weatherService';
import { getAIWeatherSuggestion } from '../services/geminiService';
import { WeatherData } from '../types';

interface Props {
  variant: 'student' | 'counselor';
}

const WeatherIcon = ({ condition, size = 24 }: { condition: string; size?: number }) => {
  const normalizedCondition = condition.toLowerCase();
  if (normalizedCondition.includes('rain')) return <CloudRain className="text-[#8A9A5B]" size={size} />;
  if (normalizedCondition.includes('clouds')) return <Cloud className="text-[#8A9A5B]" size={size} />;
  if (normalizedCondition.includes('snow')) return <Snowflake className="text-[#8A9A5B]" size={size} />;
  if (normalizedCondition.includes('haze') || normalizedCondition.includes('mist') || normalizedCondition.includes('fog')) {
    return <CloudFog className="text-[#8A9A5B]" size={size} />;
  }
  return <Sun className="text-[#8A9A5B]" size={size} />;
};

const AQI_LEVELS = {
  1: { label: 'Good', color: 'text-green-600' },
  2: { label: 'Fair', color: 'text-yellow-600' },
  3: { label: 'Moderate', color: 'text-orange-500' },
  4: { label: 'Poor', color: 'text-red-600 font-bold' },
  5: { label: 'Very Poor', color: 'text-red-700 font-extrabold' },
};

const EnvironmentWidget: React.FC<Props> = ({ variant }) => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string>("How's the weather in your world?");

  useEffect(() => {
    const fetchEnvData = async () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            setError(null);
            setLoading(true);
            const weatherData = await getWeatherData(position.coords.latitude, position.coords.longitude);
            setData(weatherData);
            const aiSuggestion = await getAIWeatherSuggestion(weatherData);
            setSuggestion(aiSuggestion);
          } catch (err) {
            setError('Could not fetch environmental data.');
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          setError('Enable location to get local insights.');
          setLoading(false);
        }
      );
    };

    fetchEnvData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchEnvData, 3600000);
    return () => clearInterval(interval);
  }, []);
  


  const renderLoading = () => (
      <div className="flex items-center justify-center gap-2 p-4 text-sm text-slate-400">
          <Loader size={16} className="animate-spin" /> Loading local vibe...
      </div>
  );
  
  const renderError = () => (
      <div className="text-center p-4 text-sm text-orange-600">{error}</div>
  );

  // Counselor Variant (Simplified)
  if (variant === 'counselor') {
    return (
      <div className="bg-white border-b border-gray-200 px-8 py-2 flex justify-between items-center text-xs text-slate-500">
        <div className="flex gap-4">
           {loading ? <span className="animate-pulse">Fetching location...</span> : 
             error ? <span className="text-red-500">{error}</span> : data ? (
               <>
                 <span className="flex items-center gap-1"><MapPin size={12} /> {data.location}</span>
                 <span className="flex items-center gap-1"><Sun size={12}/> {data.temp}°C</span>
                 <span className={`font-bold ${AQI_LEVELS[data.aqi as keyof typeof AQI_LEVELS]?.color || ''}`}>AQI: {AQI_LEVELS[data.aqi as keyof typeof AQI_LEVELS]?.label}</span>
               </>
             ) : null
           }
        </div>
        <div>{suggestion}</div>
      </div>
    );
  }

  // Student Variant (Neumorphic)
  return (
    <div className="neu-flat p-4 rounded-2xl mb-6 flex items-center justify-between min-h-[100px]">
      {loading && renderLoading()}
      {error && !loading && renderError()}
      {data && !loading && !error && (
        <>
            <div>
                <div className="text-xs text-[#708090]/60 uppercase tracking-wider mb-1">{data.location}</div>
                <div className="flex items-center gap-2">
                   <WeatherIcon condition={data.condition} />
                   <span className="text-2xl font-bold text-[#708090]">{data.temp}°</span>
                </div>
                <div className={`text-xs mt-1 ${AQI_LEVELS[data.aqi as keyof typeof AQI_LEVELS]?.color || 'text-[#CC5500]'}`}>
                  AQI • {AQI_LEVELS[data.aqi as keyof typeof AQI_LEVELS]?.label || 'Unknown'}
                </div>
            </div>
            <div className="text-right max-w-[50%]">
                <p className="text-lg font-bold text-[#8A9A5B]">{suggestion}</p>
                <p className={`text-sm mt-1 ${AQI_LEVELS[data.aqi as keyof typeof AQI_LEVELS]?.color || 'text-[#CC5500]'}`}>
                  AQI: {data.aqi} ({AQI_LEVELS[data.aqi as keyof typeof AQI_LEVELS]?.label || 'Unknown'})
                </p>
            </div>
        </>
      )}
    </div>
  );
};

export default EnvironmentWidget;