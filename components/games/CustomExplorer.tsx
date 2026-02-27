import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, RefreshCw, Send, CheckCircle, Lightbulb } from 'lucide-react';
import { generateGameElements } from '../../services/ragService';

interface CustomExplorerProps {
    gameId: string;
    gameTitle?: string;
    onComplete: () => void;
    onClose: () => void;
}

export default function CustomExplorer({ gameId, gameTitle, onComplete, onClose }: CustomExplorerProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [query, setQuery] = useState('');
    const [insights, setInsights] = useState<string[]>([]);
    const [isForging, setIsForging] = useState(false);
    const [checkedInsights, setCheckedInsights] = useState<number[]>([]);

    const handleSeekInsights = async () => {
        if (!query.trim()) return;
        setIsForging(true);
        try {
            // Repurposing ingredients to pull out custom coping insights
            const elements = await generateGameElements(gameId, query, 'ingredients');
            setInsights(elements);
            setStep(2);
        } catch (error) {
            console.error(error);
            setInsights(["Reflect on your current environment", "Take a brief pause before reacting", "Consider what is within your control right now"]);
            setStep(2);
        }
        setIsForging(false);
    };

    const handleToggleInsight = (index: number) => {
        if (checkedInsights.includes(index)) {
            setCheckedInsights(checkedInsights.filter(i => i !== index));
        } else {
            const newChecked = [...checkedInsights, index];
            setCheckedInsights(newChecked);
            if (newChecked.length === insights.length) {
                setTimeout(() => setStep(3), 1000);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm relative overflow-hidden">

            {/* Background elements */}
            <div className="absolute top-1/4 right-1/4 w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/4 w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />

            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white z-50">
                Close (Esc)
            </button>

            <div className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden relative z-10 min-h-[500px] flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-800/80 backdrop-blur-md flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Compass size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-wide">{gameTitle || 'Custom Explorer'}</h2>
                        <p className="text-slate-400 text-sm">Navigate your thoughts with guided insights.</p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 flex flex-col items-center justify-center relative">

                    <AnimatePresence mode="wait">

                        {/* STEP 1: Input Query */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="w-full max-w-md text-center"
                            >
                                <div className="w-16 h-16 mx-auto bg-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-inner transform -rotate-3">
                                    <Lightbulb className="text-yellow-400" size={32} />
                                </div>
                                <h3 className="text-2xl font-medium text-white mb-2">What is on your mind?</h3>
                                <p className="text-slate-400 text-sm mb-6">Describe the challenge or feeling you want to explore today.</p>

                                <textarea
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="e.g., 'I feel overwhelmed by my current workload and don't know where to start.'"
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-32 mb-4"
                                />

                                <button
                                    onClick={handleSeekInsights}
                                    disabled={isForging || !query.trim()}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isForging ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                                    {isForging ? 'Navigating Knowledge Base...' : 'Explore Insights'}
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 2: Interactive Insights List */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className="w-full"
                            >
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-bold text-white mb-2">Guided Action Steps</h3>
                                    <p className="text-slate-400 text-sm">Review these insights derived from your custom materials. Check them off as you reflect on them.</p>
                                </div>

                                <div className="space-y-4 max-w-xl mx-auto">
                                    {insights.map((insight, idx) => {
                                        const isChecked = checkedInsights.includes(idx);
                                        return (
                                            <motion.button
                                                key={idx}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.15 }}
                                                onClick={() => handleToggleInsight(idx)}
                                                className={`w-full text-left p-5 rounded-2xl border transition-all flex items-start gap-4 ${isChecked ? 'bg-indigo-900/30 border-indigo-500/30 opacity-75' : 'bg-slate-700/60 border-slate-600 hover:bg-slate-700 hover:border-slate-500 shadow-md'}`}
                                            >
                                                <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-500 text-white' : 'border border-slate-400 text-transparent'}`}>
                                                    {isChecked && <CheckCircle size={14} />}
                                                </div>
                                                <p className={`text-sm leading-relaxed ${isChecked ? 'text-indigo-200 line-through decoration-indigo-500/50' : 'text-slate-200'}`}>
                                                    {insight}
                                                </p>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: Completion */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full max-w-md text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", bounce: 0.5 }}
                                    className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(99,102,241,0.5)]"
                                >
                                    <Compass className="text-white w-12 h-12" />
                                </motion.div>

                                <h3 className="text-3xl font-bold text-white mb-4">Exploration Complete</h3>
                                <p className="text-slate-300 mb-8 leading-relaxed">
                                    You've successfully mapped out a new perspective. Carry these tailored insights with you as you navigate forward.
                                </p>

                                <button
                                    onClick={() => { onComplete(); onClose(); }}
                                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg"
                                >
                                    Return to Dashboard
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
