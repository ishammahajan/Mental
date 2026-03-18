import React from 'react';
import { Key } from 'lucide-react';

const NoApiKeyFallback: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f4ef] p-6 text-center">
      <Key size={48} className="text-[#8a7b63] mb-4" />
      <h1 className="text-3xl font-bold text-[#5b5350] mb-3">API Key Missing or Invalid</h1>
      <p className="text-lg text-slate-600 mb-6">
        It looks like the Gemini API key is not configured correctly.
      </p>
      <p className="text-md text-slate-500 max-w-md">
        Please ensure your <code>GEMINI_API_KEY</code> environment variable is set.
        You might need to select an API key in the AI Studio environment settings.
      </p>
      <p className="text-sm text-slate-400 mt-8">
        If the issue persists, please contact support.
      </p>
    </div>
  );
};

export default NoApiKeyFallback;


