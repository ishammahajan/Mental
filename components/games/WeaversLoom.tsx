import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Feather } from 'lucide-react';
import { generateGameElements } from '../../services/ragService';

interface WeaverProps {
    gameId: string;
    gameTitle?: string;
    onComplete: () => void;
    onClose: () => void;
}

export default function WeaversLoom({ gameId, gameTitle, onComplete, onClose }: WeaverProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [thought, setThought] = useState('');
    const [threads, setThreads] = useState<string[]>([]);
    const [isForging, setIsForging] = useState(false);
    const [activeColors, setActiveColors] = useState<number>(0);

    const handleWeave = async () => {
        if (!thought.trim()) return;
        setIsForging(true);
        try {
            const elements = await generateGameElements(gameId, thought, 'threads');
            setThreads(elements);
            setStep(2);
        } catch (error) {
            console.error(error);
            setThreads(["Call a trusted friend", "Go for a short mindful walk"]);
            setStep(2);
        }
        setIsForging(false);
    };

    const handleAcceptThread = () => {
        setActiveColors(prev => prev + 1);
        if (activeColors + 1 === threads.length) {
            setTimeout(() => setStep(3), 1500);
        }
    };

    // SVG Tapestry Colors based on active threads
    const threadColorMap = ['#475569', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    const getThreadColor = (index: number) => index < activeColors ? threadColorMap[(index % 4) + 1] : threadColorMap[0];

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm relative overflow-hidden">

            {/* Mystical Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-sky-900/20 rounded-full blur-[100px] pointer-events-none" />

            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white z-50">
                Close (Esc)
            </button>

            <div className="max-w-4xl w-full bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden relative z-10 grid grid-cols-2 min-h-[500px]">

                {/* Left Side: The Loom (Visual) */}
                <div className="border-r border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 via-transparent to-transparent pointer-events-none" />

                    <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest text-center">{gameTitle || "The Weaver's Loom"}</h2>

                    <div className="relative w-64 h-64 border-4 border-[#8B5C3E] rounded-md shadow-2xl p-4 bg-[#2C1A1D]">
                        {/* Wooden frame elements */}
                        <div className="absolute top-[-10px] left-[-10px] right-[-10px] h-4 bg-[#5B3E2B] rounded shadow-lg" />
                        <div className="absolute bottom-[-10px] left-[-10px] right-[-10px] h-4 bg-[#5B3E2B] rounded shadow-lg" />
                        <div className="absolute top-0 bottom-0 left-[-10px] w-4 bg-[#5B3E2B] shadow-lg" />
                        <div className="absolute top-0 bottom-0 right-[-10px] w-4 bg-[#5B3E2B] shadow-lg" />

                        {/* Tapestry Threads */}
                        <div className="w-full h-full flex justify-between">
                            {[...Array(15)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-1 h-full mx-0.5 rounded-full"
                                    animate={{
                                        backgroundColor: getThreadColor(Math.floor(i / (15 / Math.max(threads.length, 1)))),
                                        boxShadow: activeColors > Math.floor(i / (15 / Math.max(threads.length, 1))) ? `0 0 10px ${getThreadColor(Math.floor(i / (15 / Math.max(threads.length, 1))))}` : 'none'
                                    }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                />
                            ))}
                        </div>

                        {/* Weaving shuttle animation */}
                        <AnimatePresence>
                            {activeColors > 0 && activeColors < threads.length && (
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 200, opacity: [0, 1, 1, 0] }}
                                    transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
                                    className="absolute top-1/2 left-0 w-8 h-2 bg-yellow-600 rounded-full shadow-[0_0_10px_rgba(202,138,4,0.8)]"
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    <p className="mt-8 text-slate-400 text-xs tracking-widest uppercase">Mend the broken threads</p>
                </div>

                {/* Right Side: Interaction */}
                <div className="flex flex-col items-center justify-center p-8 bg-slate-800">
                    <AnimatePresence mode="wait">

                        {/* Step 1: Input */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full max-w-sm"
                            >
                                <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center mb-6 shadow-inner text-sky-400">
                                    <Feather size={24} />
                                </div>
                                <h3 className="text-xl font-medium text-white mb-2">A Frayed Thought</h3>
                                <p className="text-slate-400 text-sm mb-6">What thought feels unraveled or disconnected today?</p>

                                <textarea
                                    value={thought}
                                    onChange={(e) => setThought(e.target.value)}
                                    placeholder="e.g., 'I feel like I'm falling behind and there's no point trying...'"
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none h-32 mb-4"
                                />

                                <button
                                    onClick={handleWeave}
                                    disabled={isForging || !thought.trim()}
                                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isForging ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                    {isForging ? 'Consulting the Oracle...' : 'Seek the Missing Threads'}
                                </button>
                            </motion.div>
                        )}

                        {/* Step 2: Accept Threads */}
                        {step === 2 && activeColors < threads.length && (
                            <motion.div
                                key={`thread-${activeColors}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="w-full max-w-sm text-center"
                            >
                                <div className="text-sm font-bold text-sky-400 tracking-widest uppercase mb-6">
                                    Thread {activeColors + 1} of {threads.length}
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-6 leading-tight">
                                    "{threads[activeColors]}"
                                </h3>

                                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                    The Loom suggests this action to weave vibrant color back into your tapestry. Will you accept this thread?
                                </p>

                                <button
                                    onClick={handleAcceptThread}
                                    className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all flex justify-center items-center gap-2"
                                >
                                    <Sparkles size={18} /> Accept & Weave
                                </button>
                            </motion.div>
                        )}

                        {/* Step 3: Masterpiece */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full max-w-sm text-center"
                            >
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-sky-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                                    <Sparkles className="text-white w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Tapestry Restored</h3>
                                <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                                    You have woven action and intention into your thoughts, transforming a dull fray into a vibrant masterpiece. Keep these threads close.
                                </p>
                                <div className="space-y-3 text-left bg-slate-900/40 p-5 rounded-2xl border border-slate-700 mb-8">
                                    {threads.map((t, idx) => (
                                        <div key={idx} className="flex gap-3 text-sm text-white">
                                            <span style={{ color: threadColorMap[(idx % 4) + 1] }}>●</span> {t}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => { onComplete(); onClose(); }}
                                    className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all shadow-md"
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
