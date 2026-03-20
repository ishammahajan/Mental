import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Brain, Send, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { generateCognitiveReframe } from '../services/geminiService';

interface Props {
    onBack: () => void;
}

export default function CognitiveReframer({ onBack }: Props) {
    const [thought, setThought] = useState('');
    const [intensity, setIntensity] = useState(5);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const resultRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (result && !isAnalyzing) {
            requestAnimationFrame(() => {
                resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    }, [result, isAnalyzing]);

    const handleAnalyze = async () => {
        if (!thought.trim()) return;
        setIsAnalyzing(true);
        setResult(null);
        setError(false);

        try {
            const reframeText = await generateCognitiveReframe(thought);
            if (reframeText) {
                setResult(reframeText);
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">
            <div className="p-6 md:p-8 border-b border-slate-100">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 text-sm font-semibold uppercase tracking-wider"
                >
                    <ArrowLeft size={16} /> Back to Quests
                </button>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-xl shadow-inner">
                        <Brain size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cognitive Reframer</h2>
                        <p className="text-slate-500 mt-1">Challenge negative automatic thoughts using AI-assisted CBT.</p>
                    </div>
                </div>
            </div>

            <div ref={scrollContainerRef} className="p-6 md:p-8 flex-1 overflow-y-auto space-y-8 bg-slate-50/50">

                <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700">
                        What is the negative thought playing in your mind?
                    </label>
                    <textarea
                        value={thought}
                        onChange={(e) => setThought(e.target.value)}
                        placeholder="e.g., 'I got a bad grade on the macroeconomics quiz, I'm definitely going to fail out of the MBA program and ruin my career.'"
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-32 text-base transition-shadow shadow-sm hover:shadow-md"
                    />
                </div>

                <div className="space-y-4">
                    <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                        <span>How strongly do you believe this right now?</span>
                        <span className="text-purple-600 bg-purple-100 px-2 flex items-center justify-center rounded-lg">{intensity}/10</span>
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={intensity}
                        onChange={(e) => setIntensity(parseInt(e.target.value))}
                        className="w-full accent-purple-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span>Slightly</span>
                        <span>Absolutely</span>
                    </div>
                </div>

                <button
                    onClick={handleAnalyze}
                    disabled={!thought.trim() || isAnalyzing}
                    className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                    {isAnalyzing ? (
                        <>
                            <RefreshCw size={20} className="animate-spin" /> Analyzing Thought...
                        </>
                    ) : (
                        <>
                            <Sparkles size={20} /> Reframe this thought
                        </>
                    )}
                </button>

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-100 animate-in fade-in duration-300">
                        <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                        <p className="text-sm">We couldn't process this right now. Please check your network connection and try again.</p>
                    </div>
                )}

                {result && (
                    <div ref={resultRef} className="bg-white border text-sm md:text-base border-purple-100 rounded-2xl p-6 md:p-8 shadow-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Sparkles className="text-purple-500" size={20} /> AI Perspective
                        </h3>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line">{result}</p>

                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <p className="text-sm font-semibold text-slate-700 mb-4">After reading this, how strongly do you believe your original thought now?</p>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    defaultValue={intensity}
                                    className="flex-1 accent-green-600 cursor-pointer"
                                />
                                <span className="text-green-700 bg-green-100 px-3 py-1 font-bold text-sm rounded-lg flex-shrink-0">Re-rate</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-3 text-center">Often, simply observing a thought from a different angle reduces its emotional grip.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}



