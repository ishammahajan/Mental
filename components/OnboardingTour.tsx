import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Heart, Map, ArrowRight, CheckCircle, ShieldAlert, Zap } from 'lucide-react';

interface Props {
    onComplete: () => void;
}

const OnboardingTour: React.FC<Props> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [interactionComplete, setInteractionComplete] = useState(false);

    // Step states
    const [step1Ignited, setStep1Ignited] = useState(false);
    const [step2Locked, setStep2Locked] = useState(false);
    const [step3Text, setStep3Text] = useState('');
    const [step4Collected, setStep4Collected] = useState(false);

    useEffect(() => {
        setInteractionComplete(false);
        if (step === 0 && step1Ignited) setInteractionComplete(true);
        if (step === 1 && step2Locked) setInteractionComplete(true);
        if (step === 2 && step3Text.toLowerCase() === 'hi') setInteractionComplete(true);
        if (step === 3 && step4Collected) setInteractionComplete(true);
    }, [step, step1Ignited, step2Locked, step3Text, step4Collected]);

    const handleNext = () => {
        if (!interactionComplete && step < 3) return; // Must interact to continue unless bypassing
        if (step < 3) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    const steps = [
        {
            title: "Welcome to SPeakUp 🌱",
            description: "Your personal, secure sanctuary for mental well-being and growth. Let's ignite the spark to begin.",
            color: "from-emerald-900 to-slate-900",
            interactive: (
                <button
                    onClick={() => { setStep1Ignited(true); setInteractionComplete(true); }}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-700 ${step1Ignited ? 'bg-emerald-400 scale-110 shadow-[0_0_40px_rgba(52,211,153,0.6)]' : 'bg-white/10 hover:bg-white/20 animate-pulse'}`}
                >
                    <Sparkles size={40} className={step1Ignited ? 'text-white' : 'text-emerald-400'} />
                </button>
            ),
            hint: step1Ignited ? "Spark ignited! Click Next." : "Tap the spark to begin."
        },
        {
            title: "Privacy First 🔒",
            description: "Your conversations are encrypted and stay on this device. We don't use your data for ads or public models.",
            color: "from-blue-900 to-slate-900",
            interactive: (
                <button
                    onClick={() => { setStep2Locked(true); setInteractionComplete(true); }}
                    className={`w-40 h-16 rounded-full flex items-center px-2 transition-all duration-500 overflow-hidden relative border-2 ${step2Locked ? 'border-blue-400 bg-blue-900/50' : 'border-slate-600 bg-slate-800'}`}
                >
                    <div className={`absolute w-1/2 h-full top-0 bg-blue-500 transition-all duration-300 left-0 ${step2Locked ? 'opacity-10' : 'opacity-0'}`} />
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center bg-blue-500 text-white transition-all duration-500 shadow-md ${step2Locked ? 'translate-x-[5.5rem] bg-emerald-500' : 'translate-x-0'}`}>
                        {step2Locked ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                    </div>
                </button>
            ),
            hint: step2Locked ? "Data secured! Click Next." : "Tap the shield to activate end-to-end encryption."
        },
        {
            title: "SParsh AI Companion 💬",
            description: "Meet SParsh, your 24/7 wellness guide who listens like a peer. Say 'Hi' to SParsh to continue.",
            color: "from-rose-900 to-slate-900",
            interactive: (
                <form onSubmit={e => { e.preventDefault(); if (step3Text.toLowerCase() === 'hi') setInteractionComplete(true); }} className="flex gap-2 w-full max-w-[200px]">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={step3Text}
                            onChange={e => {
                                setStep3Text(e.target.value);
                                if (e.target.value.toLowerCase() === 'hi') setInteractionComplete(true);
                            }}
                            placeholder="Type 'Hi'"
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center font-bold outline-none focus:border-rose-400 transition-colors placeholder:text-slate-500"
                        />
                        {step3Text.toLowerCase() === 'hi' && (
                            <Heart size={16} className="absolute right-3 top-3.5 text-rose-400 animate-bounce" />
                        )}
                    </div>
                </form>
            ),
            hint: step3Text.toLowerCase() === 'hi' ? "SParsh says hello! Click Next." : "Type 'Hi' in the box."
        },
        {
            title: "The Wellness Odyssey 🗺️",
            description: "Take gamified clinical check-ins to build your Soul Map and earn XP. Collect your first relic below.",
            color: "from-amber-900 to-slate-900",
            interactive: (
                <button
                    onClick={() => { setStep4Collected(true); setInteractionComplete(true); }}
                    className={`relative w-24 h-24 flex items-center justify-center transition-all duration-700 ${step4Collected ? 'scale-110' : 'hover:scale-105'}`}
                >
                    <div className={`absolute inset-0 rounded-3xl rotate-45 border-2 transition-all duration-500 ${step4Collected ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.5)]' : 'border-slate-600 bg-white/5 border-dashed animate-[spin_10s_linear_infinite]'}`} />
                    <Map size={32} className={`relative z-10 transition-colors duration-500 ${step4Collected ? 'text-amber-400' : 'text-slate-400'}`} />
                    {step4Collected && <Zap size={16} className="absolute -top-2 -right-2 text-amber-400 animate-bounce" />}
                </button>
            ),
            hint: step4Collected ? "Odyssey ready! You're all set." : "Tap the spinning shard to collect."
        }
    ];

    const current = steps[step];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 overflow-hidden">
            {/* Background ambient glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${current.color} opacity-40 transition-colors duration-700`} />

            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl animate-in zoom-in duration-500">

                {/* Progress Dots */}
                <div className="flex justify-center gap-2 mb-8">
                    {steps.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-emerald-400' : 'w-2 bg-slate-700'}`} />
                    ))}
                </div>

                <div className="flex flex-col items-center text-center mt-4 min-h-[220px]">
                    <h2 className="text-2xl font-black text-white mb-3">{current.title}</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">{current.description}</p>

                    {/* Interactive Arena */}
                    <div className="h-32 flex flex-col items-center justify-center w-full relative">
                        {current.interactive}

                        <p className={`absolute bottom-[-24px] text-[10px] font-bold tracking-wider uppercase transition-opacity duration-300 ${interactionComplete ? 'text-emerald-400 opacity-100' : 'text-slate-500 opacity-80'}`}>
                            {current.hint}
                        </p>
                    </div>
                </div>

                <div className="mt-10 flex justify-between items-center">
                    <button
                        onClick={onComplete}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium cursor-pointer"
                    >
                        Skip Tour
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!interactionComplete}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${interactionComplete ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20 hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-70'}`}
                    >
                        {step === steps.length - 1 ? (
                            <>Let's Begin <CheckCircle size={18} /></>
                        ) : (
                            <>Next <ArrowRight size={18} /></>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default OnboardingTour;
