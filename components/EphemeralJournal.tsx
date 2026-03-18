import React, { useState, useEffect } from 'react';
import { PenTool, BrainCircuit, Lock, Trash2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { extractJournalThemes } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';

export default function EphemeralJournal() {
    const [text, setText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [wordCount, setWordCount] = useState(0);

    useEffect(() => {
        setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    }, [text]);

    const handleAnalyze = async () => {
        if (!text.trim() || wordCount < 10) return;
        setIsAnalyzing(true);
        setResult(null);
        setError(false);

        try {
            const themesText = await extractJournalThemes(text);
            if (themesText) {
                setResult(themesText);
                // CRUCIAL PRIVACY STEP: Immediately destroy the input text
                setText('');
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => {
        setText('');
        setResult(null);
        setError(false);
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full max-h-[800px]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                        <PenTool size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 leading-tight flex items-center gap-2">
                            Ephemeral Journal
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Zero Storage</span>
                        </h2>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <Lock size={10} /> Written words vanish after analysis
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto w-full">
                {!result ? (
                    <div className="h-full flex flex-col space-y-4 max-w-2xl mx-auto w-full">
                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
                            <p>Write out whatever is on your mind. When you click Analyze, <strong>your text is permanently destroyed</strong> from your device. The AI will only return 3 high-level themes to help you process your thoughts.</p>
                        </div>

                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Start typing... (e.g., I've been feeling really overwhelmed with the marketing project deliverables...)"
                            className="flex-1 min-h-[250px] w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white resize-none transition-all placeholder:text-slate-400 leading-relaxed font-medium"
                        />

                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${wordCount < 10 && text.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                {wordCount} words {wordCount < 10 && text.length > 0 && '(min. 10 needed)'}
                            </span>
                            <button
                                onClick={() => setText('')}
                                disabled={!text}
                                className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors font-bold disabled:opacity-50"
                            >
                                <Trash2 size={12} /> Clear Manual
                            </button>
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={!text.trim() || wordCount < 10 || isAnalyzing}
                            className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-white bg-slate-800 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md group mt-3"
                        >
                            {isAnalyzing ? (
                                <>
                                    <BrainCircuit size={18} className="animate-pulse text-blue-400" /> Extracting Themes & Shredding Text...
                                </>
                            ) : (
                                <>
                                    <BrainCircuit size={18} className="group-hover:text-blue-400 transition-colors" /> Analyze & Burn Entry
                                </>
                            )}
                        </button>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100 font-medium">
                                <AlertCircle size={16} /> Error connecting to AI. Your text is still here.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 w-full">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-4">
                            <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full flex-shrink-0 mt-0.5">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-800 text-lg mb-1">Journal Entry Destroyed</h3>
                                <p className="text-sm text-emerald-700/80 leading-relaxed">Your raw text has been completely wiped from memory. Here are the objective themes SParsh observed from your writing.</p>
                            </div>
                        </div>

                        <div className="bg-white border text-sm md:text-base border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
                            <div className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:leading-relaxed prose-li:my-1 prose-strong:text-slate-700">
                                <MarkdownRenderer text={result} />
                            </div>
                        </div>

                        <button
                            onClick={handleReset}
                            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            Start New Entry <ArrowRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}



