import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, RefreshCw, Feather, Flame, Sparkles, CheckCircle } from 'lucide-react';
import { generateGameElements } from '../../services/ragService';

interface AlchemistProps {
    gameId: string;
    gameTitle?: string;
    onComplete: () => void;
    onClose: () => void;
}

export default function AlchemistOfShadows({ gameId, gameTitle, onComplete, onClose }: AlchemistProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [worry, setWorry] = useState('');
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [isForging, setIsForging] = useState(false);
    const [addedIngredients, setAddedIngredients] = useState<string[]>([]);

    const handleTransmute = async () => {
        if (!worry.trim()) return;
        setIsForging(true);
        try {
            const elements = await generateGameElements(gameId, worry, 'ingredients');
            setIngredients(elements);
            setStep(2);
        } catch (error) {
            console.error(error);
            // Fallback mechanics
            setIngredients(["Deep Grounding Breaths", "Mindful Observation", "Fact-Checking Protocol"]);
            setStep(2);
        }
        setIsForging(false);
    };

    const handleIngredientDrop = (ingredient: string) => {
        if (!addedIngredients.includes(ingredient)) {
            setAddedIngredients(prev => [...prev, ingredient]);
            if (addedIngredients.length === ingredients.length - 1) {
                setTimeout(() => setStep(3), 1000);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm relative overflow-hidden">
            {/* Background mystical elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />

            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white z-50">
                Close (Esc)
            </button>

            <div className="max-w-3xl w-full bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden relative z-10">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-800/80 backdrop-blur-md flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <Wand2 size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-wide">{gameTitle || 'The Alchemist of Shadows'}</h2>
                        <p className="text-slate-400 text-sm">Transmute leaden thoughts into golden calm.</p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-8 min-h-[400px] flex flex-col items-center justify-center relative">

                    <AnimatePresence mode="wait">

                        {/* STEP 1: Input Worry */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="w-full max-w-md text-center"
                            >
                                <div className="w-16 h-16 mx-auto bg-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-inner transform rotate-3">
                                    <Feather className="text-slate-300" size={32} />
                                </div>
                                <h3 className="text-2xl font-medium text-white mb-2">Identify the Leaden Thought</h3>
                                <p className="text-slate-400 text-sm mb-6">What shadow currently clouds your mind?</p>

                                <textarea
                                    value={worry}
                                    onChange={(e) => setWorry(e.target.value)}
                                    placeholder="e.g., 'I feel overwhelmed by the upcoming exams...'"
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none h-32 mb-4"
                                />

                                <button
                                    onClick={handleTransmute}
                                    disabled={isForging || !worry.trim()}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isForging ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
                                    {isForging ? 'Consulting the Tomes...' : 'Seek Transmutation Recipe'}
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 2: The Alchemy Jar Interactive Phase */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className="w-full h-full flex flex-col items-center justify-center gap-10"
                            >
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-white mb-2">The Recipe of Resilience</h3>
                                    <p className="text-slate-400 text-sm max-w-xl mx-auto">
                                        The tomes have revealed {ingredients.length} coping ingredients tailored to your shadow.
                                        Drag them into the Alchemy Jar below to forge your golden calm.
                                    </p>
                                </div>

                                <div className="flex w-full max-w-4xl px-4 gap-8 justify-between items-end">

                                    {/* Ingredients Source */}
                                    <div className="w-1/3 space-y-4 pt-4">
                                        {ingredients.map((ing, i) => {
                                            const isAdded = addedIngredients.includes(ing);
                                            return (
                                                <motion.div
                                                    key={ing}
                                                    drag={!isAdded}
                                                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                                    dragElastic={0.6}
                                                    onDragEnd={(e, info) => {
                                                        // Check if dropped near the center (simplistic collision)
                                                        if (info.point.x > window.innerWidth / 2 - 150 && info.point.y > window.innerHeight / 2) {
                                                            handleIngredientDrop(ing);
                                                        }
                                                    }}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: isAdded ? 0 : 1, x: 0 }}
                                                    transition={{ delay: i * 0.2 }}
                                                    className={`bg-slate-700/80 border border-slate-600 p-4 rounded-xl shadow-lg cursor-grab active:cursor-grabbing hover:bg-slate-600 transition-colors ${isAdded ? 'pointer-events-none' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                                                            {i + 1}
                                                        </div>
                                                        <p className="text-sm font-medium text-white leading-tight">{ing}</p>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>

                                    {/* The Alchemy Jar (Drop Zone) */}
                                    <div className="w-1/3 flex flex-col items-center">
                                        <motion.div
                                            className="relative w-48 h-56 border-4 border-slate-500 rounded-b-[40px] rounded-t-sm bg-slate-900/40 shadow-[inset_0_-20px_50px_rgba(139,92,246,0.2)] flex flex-col justify-end overflow-hidden pb-4"
                                            animate={{
                                                boxShadow: `inset 0 -${addedIngredients.length * 30}px 60px rgba(139,92,246,0.4)`
                                            }}
                                        >
                                            {/* Jar Lip */}
                                            <div className="absolute top-0 left-[-8px] right-[-8px] h-4 bg-slate-500 rounded-full" />

                                            {/* Simulating fluid rising */}
                                            <motion.div
                                                className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 opacity-90 blur-[2px]"
                                                animate={{ height: `${(addedIngredients.length / ingredients.length) * 100}%` }}
                                                transition={{ type: "spring", stiffness: 50 }}
                                            />

                                            {addedIngredients.length === ingredients.length && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="absolute inset-0 flex items-center justify-center"
                                                >
                                                    <Sparkles className="text-yellow-300 w-16 h-16 animate-pulse" />
                                                </motion.div>
                                            )}
                                        </motion.div>
                                        <div className="mt-6 flex flex-col items-center">
                                            <Flame className="text-orange-500 animate-pulse w-8 h-8 mb-1" />
                                            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest bg-slate-900 py-1 px-3 rounded-full">Alchemy Jar</p>
                                        </div>
                                    </div>

                                    {/* Empty space for balance */}
                                    <div className="w-1/3" />

                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: Transmutation Complete */}
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
                                    className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(250,204,21,0.5)]"
                                >
                                    <CheckCircle className="text-white w-12 h-12" />
                                </motion.div>

                                <h3 className="text-3xl font-bold text-white mb-4">Silver Lining Secured</h3>
                                <p className="text-slate-300 mb-8 leading-relaxed">
                                    Your leaden thought has been transmuted. Keep these ingredients firmly planted in your mind whenever the shadow attempts to return.
                                </p>

                                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 mb-8">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Your Active Formula</h4>
                                    <ul className="space-y-3 text-left">
                                        {ingredients.map(ing => (
                                            <li key={ing} className="flex items-start gap-3">
                                                <Sparkles className="text-emerald-400 w-5 h-5 shrink-0 mt-0.5" />
                                                <span className="text-white text-sm">{ing}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

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
