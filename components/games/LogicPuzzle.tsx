import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Unlock, Lock, RefreshCw, AlertTriangle } from 'lucide-react';
import { generateGameElements } from '../../services/ragService';

interface LogicPuzzleProps {
    gameId: string;
    gameTitle?: string;
    onComplete: () => void;
    onClose: () => void;
}

export default function LogicPuzzle({ gameId, gameTitle, onComplete, onClose }: LogicPuzzleProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [distortion, setDistortion] = useState('');
    const [keys, setKeys] = useState<string[]>([]);
    const [isForging, setIsForging] = useState(false);
    const [unlockedKeys, setUnlockedKeys] = useState<number[]>([]);

    const handleSeekKeys = async () => {
        if (!distortion.trim()) return;
        setIsForging(true);
        try {
            const elements = await generateGameElements(gameId, distortion, 'ingredients'); // repurpose ingredients prompt logic to get 3 items
            setKeys(elements);
            setStep(2);
        } catch (error) {
            console.error(error);
            setKeys(["Is there evidence against this thought?", "Am I assuming the worst?", "What would I tell a friend in this situation?"]);
            setStep(2);
        }
        setIsForging(false);
    };

    const handleKeyClick = (index: number) => {
        if (!unlockedKeys.includes(index)) {
            const newUnlocked = [...unlockedKeys, index];
            setUnlockedKeys(newUnlocked);
            if (newUnlocked.length === keys.length) {
                setTimeout(() => setStep(3), 1000);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm relative overflow-hidden">

            {/* Abstract Background */}
            <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-teal-900/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-emerald-900/20 rounded-full blur-[100px] pointer-events-none" />

            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white z-50">
                Close (Esc)
            </button>

            <div className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col min-h-[500px]">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-800/80 backdrop-blur-md flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 border border-teal-500/30">
                        <Lock size={18} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-wide">{gameTitle || 'Cognitive Unlocking'}</h2>
                        <p className="text-slate-400 text-sm">Dismantle cognitive distortions step by step.</p>
                    </div>
                </div>

                <div className="flex-1 p-8 flex flex-col items-center justify-center">
                    <AnimatePresence mode="wait">

                        {/* STEP 1 */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                className="w-full text-center max-w-md"
                            >
                                <AlertTriangle className="mx-auto text-amber-500 w-12 h-12 mb-6" />
                                <h3 className="text-2xl font-bold text-white mb-2">The Mental Knot</h3>
                                <p className="text-slate-400 text-sm mb-6">Describe a rigid thought or assumption you are currently holding onto.</p>
                                <textarea
                                    value={distortion}
                                    onChange={(e) => setDistortion(e.target.value)}
                                    placeholder="e.g., 'If I fail this presentation, my entire career is ruined...'"
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none resize-none h-32 mb-6"
                                />
                                <button
                                    onClick={handleSeekKeys}
                                    disabled={isForging || !distortion.trim()}
                                    className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(20,184,166,0.5)] flex items-center justify-center gap-2"
                                >
                                    {isForging ? <RefreshCw className="animate-spin" size={18} /> : <Key size={18} />}
                                    {isForging ? 'Synthesizing Keys...' : 'Generate Logic Keys'}
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="w-full text-center"
                            >
                                <div className="relative w-24 h-24 mx-auto mb-8">
                                    <Lock className={`w-full h-full text-slate-600 transition-colors duration-1000 ${unlockedKeys.length === keys.length ? 'text-teal-500' : ''}`} />
                                    {unlockedKeys.length === keys.length && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center">
                                            <Unlock className="w-16 h-16 text-emerald-400 absolute bg-slate-800 p-2 rounded-full" />
                                        </motion.div>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-6">Click the keys to dismantle the distortion</h3>

                                <div className="grid gap-4 max-w-xl mx-auto">
                                    {keys.map((keyText, index) => {
                                        const isUnlocked = unlockedKeys.includes(index);
                                        return (
                                            <motion.button
                                                key={index}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.2 }}
                                                onClick={() => handleKeyClick(index)}
                                                disabled={isUnlocked}
                                                className={`p-4 rounded-xl border text-left flex items-start gap-4 transition-all duration-500 ${isUnlocked ? 'bg-emerald-900/40 border-emerald-500/50 opacity-70 cursor-default' : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 cursor-pointer shadow-lg hover:shadow-teal-900/50'}`}
                                            >
                                                <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'}`}>
                                                    {isUnlocked ? <Unlock size={14} /> : <Key size={14} />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium leading-relaxed ${isUnlocked ? 'text-emerald-300' : 'text-slate-200'}`}>{keyText}</p>
                                                </div>
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full text-center max-w-md"
                            >
                                <motion.div
                                    initial={{ rotate: -90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    transition={{ type: "spring" }}
                                    className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.5)]"
                                >
                                    <Unlock className="text-white w-12 h-12" />
                                </motion.div>
                                <h3 className="text-3xl font-bold text-white mb-4">Mind Unlocked</h3>
                                <p className="text-slate-300 mb-8 leading-relaxed">
                                    You have successfully dismantled the rigid thought pattern. Remember these logic keys whenever you feel stuck in this mental knot.
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
