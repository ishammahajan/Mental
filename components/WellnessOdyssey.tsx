import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { Shield, Star, Sparkles, ChevronRight, Download, RotateCcw, Zap, Heart, Brain, MessageSquare, Calendar as CalendarIcon } from 'lucide-react';
import { saveSurveyResult, getSurveyResults, SurveyResult } from '../services/storage';
import * as db from '../services/storage';
import { useNotification } from '../contexts/NotificationContext';

// ─── Survey Data ─────────────────────────────────────────────────────────────

const GAD7_QUESTIONS = [
    { id: 'g1', guardian: 'The Worry Warden', realm: 'The Fog of Unease', question: 'Feeling nervous, anxious, or on edge', domain: 'Anxiety' },
    { id: 'g2', guardian: 'The Restless Sentinel', realm: 'The Sea of Anticipation', question: 'Not being able to stop or control worrying', domain: 'Control' },
    { id: 'g3', guardian: 'The Spiral Specter', realm: 'The Canyon of Overthought', question: 'Worrying too much about different things', domain: 'Worry' },
    { id: 'g4', guardian: 'The Stillness Ghost', realm: 'The Restless Valley', question: 'Trouble relaxing', domain: 'Relaxation' },
    { id: 'g5', guardian: 'The Storm Keeper', realm: 'The Thunder Plains', question: 'Being so restless that it\'s hard to sit still', domain: 'Restlessness' },
    { id: 'g6', guardian: 'The Irritant Oracle', realm: 'The Bristling Peaks', question: 'Becoming easily annoyed or irritable', domain: 'Irritability' },
    { id: 'g7', guardian: 'The Dread Harbinger', realm: 'The Shadow Gate', question: 'Feeling afraid as if something awful might happen', domain: 'Dread' },
];

const BDI_QUESTIONS = [
    { id: 'b1', guardian: 'The Sadness Sage', realm: 'The Grey Marshes', question: 'Feeling sad or hopeless', domain: 'Mood' },
    { id: 'b2', guardian: 'The Future Watcher', realm: 'The Misty Horizon', question: 'Pessimism about the future', domain: 'Outlook' },
    { id: 'b3', guardian: 'The Past Keeper', realm: 'The Memory Ruins', question: 'Sense of past failure', domain: 'Self-View' },
    { id: 'b4', guardian: 'The Joy Thief', realm: 'The Colorless Garden', question: 'Loss of pleasure in activities you used to enjoy', domain: 'Pleasure' },
    { id: 'b5', guardian: 'The Guilt Guardian', realm: 'The Weight Cavern', question: 'Feeling guilty or punishing yourself', domain: 'Guilt' },
    { id: 'b6', guardian: 'The Self Mirror', realm: 'The Shattered Shore', question: 'Negative feelings about yourself', domain: 'Self-Worth' },
    { id: 'b7', guardian: 'The Thought Warden', realm: 'The Dark Corridor', question: 'Thoughts of harming yourself', domain: 'Safety' },
    { id: 'b8', guardian: 'The Isolation Wraith', realm: 'The Empty Citadel', question: 'Withdrawing from people', domain: 'Social' },
    { id: 'b9', guardian: 'The Decision Specter', realm: 'The Crossroads Fog', question: 'Difficulty making decisions', domain: 'Cognition' },
    { id: 'b10', guardian: 'The Worth Phantom', realm: 'The Worthless Wastes', question: 'Feeling worthless', domain: 'Worth' },
    { id: 'b11', guardian: 'The Energy Wraith', realm: 'The Drained Dunes', question: 'Fatigue or loss of energy', domain: 'Energy' },
    { id: 'b12', guardian: 'The Sleep Spirit', realm: 'The Restless Skies', question: 'Changes in sleep patterns', domain: 'Sleep' },
    { id: 'b13', guardian: 'The Irritation Imp', realm: 'The Prickle Fields', question: 'Irritability', domain: 'Mood' },
    { id: 'b14', guardian: 'The Appetite Arbiter', realm: 'The Hunger Hollows', question: 'Changes in appetite', domain: 'Physical' },
    { id: 'b15', guardian: 'The Focus Phantom', realm: 'The Clouded Mind', question: 'Difficulty concentrating', domain: 'Cognition' },
    { id: 'b16', guardian: 'The Tiredness Titan', realm: 'The Heavy Hills', question: 'Feeling tired all the time', domain: 'Energy' },
    { id: 'b17', guardian: 'The Desire Dimmer', realm: 'The Faded Oasis', question: 'Loss of interest in daily life', domain: 'Interest' },
    { id: 'b18', guardian: 'The Physical Phantom', realm: 'The Ache Abyss', question: 'Unexplained physical symptoms', domain: 'Physical' },
    { id: 'b19', guardian: 'The Confidence Shade', realm: 'The Uncertain Shore', question: 'Low self-confidence', domain: 'Self-Worth' },
    { id: 'b20', guardian: 'The Agitation Agent', realm: 'The Tremor Tundra', question: 'Feeling anxious or agitated', domain: 'Anxiety' },
    { id: 'b21', guardian: 'The Meaning Mist', realm: 'The Final Veil', question: 'Loss of interest in life', domain: 'Interest' },
];

const FREQUENCY_OPTIONS = [
    { value: 0, label: 'Not at all', color: '#64748b', emoji: '🌟', xp: 30 },
    { value: 1, label: 'Several days', color: '#64748b', emoji: '🌤', xp: 20 },
    { value: 2, label: 'More than half the days', color: '#64748b', emoji: '⛅', xp: 10 },
    { value: 3, label: 'Nearly every day', color: '#64748b', emoji: '⛈', xp: 5 },
];

// ─── Wellness Knowledge Base (RAG-lite) ──────────────────────────────────────
const WELLNESS_RELICS: Record<string, string[]> = {
    Anxiety: ['Box Breathing: Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 4 times.', '5-4-3-2-1 Grounding: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.'],
    Control: ['Write your worries on paper, then physically crumple and throw away. You have control over your actions, not outcomes.', 'Scheduled Worry Time: Allow yourself 15 min/day to worry. Outside that, gently redirect.'],
    Worry: ['Progressive Muscle Relaxation: Tense then release each muscle group from toes to head.', 'When a worry arrives, ask: "Is this actionable now?" If yes, act. If no, release it.'],
    Relaxation: ['Create a bedtime ritual: 20 min of reading, then a body scan meditation.', 'The Sighing Breath: Inhale normally, then take a second sip of air, then exhale fully with a sigh.'],
    Restlessness: ['Cold water splash on face triggers the dive reflex and calms your nervous system.', 'Shake it out: Stand and shake your hands, arms, then whole body for 30 seconds.'],
    Irritability: ['S.T.O.P: Stop, Take a breath, Observe your emotion, Proceed mindfully.', 'Identify your irritation trigger — often it signals an unmet need. What do you need right now?'],
    Dread: ['Name the fear precisely: "I am afraid that ___." Specificity reduces its power.', 'Remember: Anxiety predicts catastrophe 85% of the time inaccurately. What evidence counters the fear?'],
    Mood: ['3 Good Things: Every evening, write 3 things that went well today — however small.', 'Behavioral Activation: Do one enjoyable activity per day, even if you don\'t feel like it.'],
    Outlook: ['Future self letter: Write a kind letter from your future self who got through this period.', 'Focus on the next 24 hours, not the distant future. "What is one good thing I can do today?"'],
    'Self-View': ['List 3 things you did well this week — not achievements, just kind or capable actions.', 'Failure is data, not identity. "I made a mistake" vs "I am a mistake."'],
    Pleasure: ['Schedule one micro-pleasure per day: music you love, a favorite snack, 5 min of sunlight.', 'Anhedonia often lifts with action before motivation. Act first, feeling follows.'],
    Guilt: ['Ask: "Would I judge a friend this harshly for the same thing?" Apply that same compassion to yourself.', 'Distinguish healthy guilt (signals a value violation to repair) from toxic shame (attacks your identity).'],
    'Self-Worth': ['Write one thing you like about yourself. Physical, personality, skill — anything counts.', 'You are not what you produce. Your worth is inherent, not earned.'],
    Safety: ['🆘 If you are having thoughts of self-harm, please reach out: iCall 9152987821. You matter.', 'These thoughts are symptoms of pain, not plans. Talk to someone today.'],
    Social: ['Send one genuine message to someone you care about today. Connection is medicine.', 'Small exposure: Smile at or say hello to one person. Build social momentum gradually.'],
    Cognition: ['Two-minute rule: If a decision takes < 2 min to implement, do it now. Otherwise, set a timer.', '"Good enough" is often better than perfect. A done decision beats a perfect pending one.'],
    Worth: ['Identify one thing you contributed to someone today — it doesn\'t have to be big.', 'Competence grows with action. Start small, gain evidence of your capability.'],
    Energy: ['Sleep hygiene: Same sleep/wake time, no screens 30 min before bed, cool dark room.', 'Even a 10-min walk substantially boosts energy and mood via BDNF release.'],
    Sleep: ['Sleep-wake consistency is the most powerful sleep tool. Set an alarm — and keep it on weekends.', 'If you can\'t sleep, do a boring task in dim light. Bed is for sleep only.'],
    Physical: ['Hydration check: Are you drinking 2L+ of water today? Dehydration mimics depression.', 'Movement medicine: 20 min of any physical activity cuts depressive symptoms by 30%.'],
    Interest: ['Curiosity contract: Try one new thing this week — a recipe, a podcast, a 5-min skill.', 'Interest often returns gradually. Start with passive engagement (watching, listening) before active.'],
};

// ─── HF Oracle ───────────────────────────────────────────────────────────────
const HF_TOKEN = (import.meta as any).env?.VITE_HF_TOKEN || '';

const askOracle = async (question: string, domain: string, answerValue: number): Promise<string> => {
    const relic = WELLNESS_RELICS[domain]?.[Math.floor(Math.random() * 2)] || WELLNESS_RELICS['Mood'][0];

    if (!HF_TOKEN) return relic;

    try {
        const prompt = `You are the "Oracle of Calm," a gentle wellness guide. A student answered a mental wellness check-in question about "${question}" with frequency "${FREQUENCY_OPTIONS[answerValue].label}". 
Provide a 2-sentence personalized, warm, actionable insight. Reference this wellness tip: "${relic}". 
Be poetic but practical. Do NOT mention clinical terms or diagnoses.`;

        const res = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'mistralai/Mistral-7B-Instruct-v0.3', messages: [{ role: 'user', content: prompt }], max_tokens: 100, temperature: 0.8 }),
            signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) return relic;
        const d = await res.json();
        return d?.choices?.[0]?.message?.content || relic;
    } catch {
        return relic;
    }
};

// ─── Scoring ─────────────────────────────────────────────────────────────────
const getSeverity = (score: number, max: number, type: 'GAD7' | 'BDI') => {
    const pct = score / max;
    if (type === 'GAD7') {
        if (score <= 4) return { label: 'Minimal', color: '#22c55e', stage: 1 };
        if (score <= 9) return { label: 'Mild', color: '#84cc16', stage: 2 };
        if (score <= 14) return { label: 'Moderate', color: '#f59e0b', stage: 3 };
        return { label: 'Severe', color: '#ef4444', stage: 4 };
    } else {
        if (score <= 13) return { label: 'Minimal', color: '#22c55e', stage: 1 };
        if (score <= 19) return { label: 'Mild', color: '#84cc16', stage: 2 };
        if (score <= 28) return { label: 'Moderate', color: '#f59e0b', stage: 3 };
        return { label: 'Severe', color: '#ef4444', stage: 4 };
    }
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
    surveyType: 'GAD7' | 'BDI';
    userId: string;
    onClose: () => void;
}

type Stage = 'intro' | 'guardian' | 'relic' | 'soul_map';

const atmosphereColors = (healthPct: number) => {
    // 0% health = dark grey, 100% health = teal/emerald
    const r = Math.round(30 + healthPct * 0);
    const g = Math.round(30 + healthPct * 80);
    const b = Math.round(50 + healthPct * 80);
    return `rgb(${r},${g},${b})`;
};

const WellnessOdyssey: React.FC<Props> = ({ surveyType, userId, onClose }) => {
    const questions = surveyType === 'GAD7' ? GAD7_QUESTIONS : BDI_QUESTIONS;
    const maxScore = questions.length * 3;
    const { addNotification } = useNotification();

    const [stage, setStage] = useState<Stage>('intro');
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [shuffledOptions, setShuffledOptions] = useState(FREQUENCY_OPTIONS);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [historicalScores, setHistoricalScores] = useState<SurveyResult[]>([]);
    const [sharingSent, setSharingSent] = useState(false);

    useEffect(() => {
        setShuffledOptions([...FREQUENCY_OPTIONS].sort(() => Math.random() - 0.5));
    }, [currentIdx]);
    const [relic, setRelic] = useState('');
    const [isLoadingRelic, setIsLoadingRelic] = useState(false);
    const [xp, setXp] = useState(0);
    const [animating, setAnimating] = useState(false);
    const [surveyResult, setSurveyResult] = useState<SurveyResult | null>(null);

    const totalScore = answers.reduce((s, a) => s + a, 0);
    const healthPct = Math.max(0, 1 - totalScore / (maxScore || 1));
    const currentQ = questions[currentIdx];
    const isLastQ = currentIdx === questions.length - 1;
    const bgColor = atmosphereColors(healthPct);
    const progress = ((currentIdx + (answers.length > currentIdx ? 1 : 0)) / questions.length) * 100;

    const handleAnswer = async (value: number) => {
        if (animating) return;
        setAnimating(true);
        setSelectedAnswer(value);
        setIsLoadingRelic(true);
        setStage('relic');

        const tip = await askOracle(currentQ.question, currentQ.domain, value);
        setRelic(tip);
        setXp(prev => prev + FREQUENCY_OPTIONS[value].xp);
        setIsLoadingRelic(false);
        setAnimating(false);
    };

    const advanceToNext = () => {
        const newAnswers = [...answers, selectedAnswer!];
        setAnswers(newAnswers);
        setSelectedAnswer(null);

        if (isLastQ) {
            const score = newAnswers.reduce((s, a) => s + a, 0);
            const result: SurveyResult = {
                id: Date.now().toString(), userId, surveyType, score, maxScore,
                answers: newAnswers, completedAt: new Date().toISOString(),
            };
            setSurveyResult(result);
            saveSurveyResult(result);

            // Load historical scores for trend chart
            getSurveyResults(userId).then(all => {
                setHistoricalScores(all.filter(r => r.surveyType === surveyType));
            });

            setStage('soul_map');
        } else {
            setCurrentIdx(prev => prev + 1);
            setStage('guardian');
        }
    };

    // Soul Map data
    const domainScores = () => {
        const domains: Record<string, { total: number; count: number }> = {};
        questions.forEach((q, i) => {
            if (!domains[q.domain]) domains[q.domain] = { total: 0, count: 0 };
            domains[q.domain].total += (answers[i] ?? 0);
            domains[q.domain].count++;
        });
        return Object.entries(domains).map(([domain, { total, count }]) => ({
            domain: domain.slice(0, 8),
            wellness: Math.round((1 - total / (count * 3)) * 100),
        }));
    };

    const handleDownload = () => {
        if (!surveyResult) return;
        const severity = getSeverity(surveyResult.score, maxScore, surveyType);
        const domains = domainScores();
        const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>Wellness Odyssey Report – ${surveyType}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; color: #1e293b; font-size: 14px; line-height: 1.6; }
  h1 { color: #0d2d1a; font-size: 24px; } h2 { color: #065f46; font-size: 16px; margin-top: 24px; }
  .badge { display: inline-block; padding: 4px 14px; border-radius: 9999px; font-weight: 700; font-size: 13px; color: white; background: ${severity.color}; }
  .score-row { display: flex; justify-content: space-between; background: #f0fdf4; padding: 16px; border-radius: 12px; margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #065f46; color: white; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .bar-wrap { background: #e2e8f0; border-radius: 99px; height: 12px; }
  .bar-fill { height: 12px; border-radius: 99px; background: #10b981; }
  .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { button { display: none; } }
</style>
</head><body>
<h1>🗺️ Wellness Odyssey Report</h1>
<p><strong>Survey:</strong> ${surveyType === 'GAD7' ? 'GAD-7 Anxiety Assessment' : 'BDI-II Depression Inventory'}</p>
<p><strong>Completed:</strong> ${new Date(surveyResult.completedAt).toLocaleString('en-IN')}</p>
<p><strong>User ID:</strong> ${surveyResult.userId}</p>

<div class="score-row">
  <div><strong>Score</strong><br/><span style="font-size:28px;font-weight:900">${surveyResult.score}</span> / ${maxScore}</div>
  <div><strong>Severity</strong><br/><span class="badge">${severity.label}</span></div>
  <div><strong>XP Earned</strong><br/><span style="font-size:28px;font-weight:900;color:#d97706">${xp} XP</span></div>
</div>

<h2>Domain Wellness Breakdown</h2>
<table>
  <tr><th>Domain</th><th>Wellness Score</th><th>Progress</th></tr>
  ${domains.map(d => `<tr><td>${d.domain}</td><td>${d.wellness}%</td><td><div class="bar-wrap"><div class="bar-fill" style="width:${d.wellness}%"></div></div></td></tr>`).join('')}
</table>

<h2>Clinical Disclaimer</h2>
<p>⚕️ This is a <strong>wellness awareness tool</strong>, not a clinical diagnosis. If you scored Moderate or Severe, please consider speaking with a counselor. Your results are private and encrypted on your device.</p>
<p>In a crisis? Call <strong>iCall: 9152987821</strong></p>

<div class="footer">Generated by SPeakUp Mental Health Platform · SPJIMR · ${new Date().toLocaleDateString('en-IN')}</div>
<script>window.onload = () => window.print();</script>
</body></html>`;
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    };

    // ─── INTRO ───────────────────────────────────────────────────────────────
    if (stage === 'intro') {
        return (
            <div className="relative w-full h-full min-h-[500px] flex items-center justify-center overflow-hidden rounded-3xl flex-col"
                style={{ background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)' }}>

                {/* Stars */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {Array.from({ length: 60 }).map((_, i) => (
                        <div key={i} className="absolute rounded-full bg-white animate-pulse"
                            style={{ width: `${1 + Math.random() * 2}px`, height: `${1 + Math.random() * 2}px`, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s`, opacity: 0.3 + Math.random() * 0.7 }} />
                    ))}
                </div>

                <div className="relative z-10 text-center px-8 max-w-lg animate-in fade-in duration-700">
                    <div className="text-6xl mb-4 animate-bounce">{surveyType === 'GAD7' ? '🌀' : '🌑'}</div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-wide">The Wellness Odyssey</h1>
                    <p className="text-emerald-400 font-bold text-lg mb-2">
                        {surveyType === 'GAD7' ? 'The Anxiety Realm (GAD-7)' : 'The Depression Depths (BDI-II)'}
                    </p>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        You are a <strong className="text-white">Navigator</strong> journeying through a <strong className="text-white">Clouded Realm</strong>.
                        Speak with <strong className="text-white">{questions.length} Guardians</strong> and restore your realm to light.
                        Each Guardian asks one question. Answer truthfully — the Oracle will gift you a <strong className="text-emerald-400">Relic of Wisdom</strong>.
                    </p>
                    <div className="flex gap-3 justify-center mb-6">
                        <div className="bg-white/10 rounded-xl px-4 py-2 text-xs text-slate-300">
                            <p className="text-emerald-400 font-bold text-lg">{questions.length}</p>
                            <p>Guardians</p>
                        </div>
                        <div className="bg-white/10 rounded-xl px-4 py-2 text-xs text-slate-300">
                            <p className="text-yellow-400 font-bold text-lg">{questions.length * 20}</p>
                            <p>Max XP</p>
                        </div>
                        <div className="bg-white/10 rounded-xl px-4 py-2 text-xs text-slate-300">
                            <p className="text-purple-400 font-bold text-lg">1</p>
                            <p>Soul Map</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-6">⚕️ Clinical scale, not a diagnosis. For wellness awareness only.</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-400 text-sm hover:text-white transition-colors">← Back</button>
                        <button onClick={() => setStage('guardian')}
                            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 flex items-center gap-2">
                            Begin Odyssey <Zap size={16} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── SOUL MAP ─────────────────────────────────────────────────────────────
    if (stage === 'soul_map' && surveyResult) {
        const severity = getSeverity(surveyResult.score, maxScore, surveyType);
        const soulData = domainScores();
        return (
            <div className="relative w-full h-full min-h-[600px] overflow-y-auto rounded-3xl"
                style={{ background: `linear-gradient(135deg, ${bgColor} 0%, #0d2d1a 100%)` }}>
                <div className="p-8 flex flex-col items-center">
                    <div className="w-full max-w-2xl animate-in fade-in duration-700">
                        <div className="text-center mb-8">
                            <div className="text-5xl mb-3">🗺️</div>
                            <h2 className="text-3xl font-black text-white mb-1">Your Soul Map</h2>
                            <p className="text-emerald-400">Odyssey Complete · {xp} XP Earned</p>
                        </div>

                        {/* Score Card */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <p className="text-slate-300 text-sm">{surveyType === 'GAD7' ? 'GAD-7 Anxiety Score' : 'BDI-II Depression Score'}</p>
                                    <p className="text-4xl font-black text-white">{surveyResult.score}<span className="text-lg text-slate-400">/{maxScore}</span></p>
                                </div>
                                <div className="text-center">
                                    <span className="px-4 py-2 rounded-full text-sm font-bold text-white" style={{ backgroundColor: severity.color }}>
                                        {severity.label}
                                    </span>
                                    <p className="text-xs text-slate-400 mt-1">Severity Level</p>
                                </div>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${(surveyResult.score / maxScore) * 100}%`, backgroundColor: severity.color }} />
                            </div>
                        </div>

                        {/* Radar Chart */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
                            <h3 className="text-white font-bold mb-4 text-center">📐 Wellness Domains</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <RadarChart data={soulData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.2)" />
                                    <PolarAngleAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <Radar name="Wellness" dataKey="wellness" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
                            <h3 className="text-white font-bold mb-4 text-center">📊 Wellness by Domain (%)</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={soulData}>
                                    <XAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }} />
                                    <Bar dataKey="wellness" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Disclaimer */}
                        <div className="bg-amber-900/40 border border-amber-500/30 rounded-xl p-4 mb-6 text-xs text-amber-300">
                            ⚕️ <strong>Clinical Note:</strong> This is a wellness awareness tool, not a clinical diagnosis. If you scored Moderate or Severe, please consider speaking with the counselor. Your results are stored locally and encrypted.
                        </div>

                        {/* Historical Trend Chart */}
                        {historicalScores.length > 1 && (
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
                                <h3 className="text-white font-bold mb-4 text-center">📈 Your Score Over Time</h3>
                                <ResponsiveContainer width="100%" height={160}>
                                    <LineChart data={historicalScores.slice().reverse().slice(-10).map((r, i) => ({
                                        attempt: `Attempt ${i + 1}`,
                                        date: new Date(r.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                                        score: r.score,
                                        max: r.maxScore,
                                    }))} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                        <YAxis domain={[0, maxScore]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                                            formatter={(value: number) => [value, 'Score']}
                                        />
                                        <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                                <p className="text-[10px] text-slate-400 text-center mt-2">Last {Math.min(historicalScores.length, 10)} attempts shown</p>
                            </div>
                        )}

                        {/* Share with counselor / Book CTAs (student-initiated only, Moderate+) */}
                        {severity.stage >= 3 && (
                            <div className="bg-white/8 border border-white/15 rounded-2xl p-5 mb-6">
                                <p className="text-white text-sm font-bold mb-1.5 text-center">
                                    {severity.stage >= 4
                                        ? 'Your score suggests it may help to connect with someone soon.'
                                        : 'Talking to someone can help.'}
                                </p>
                                <p className="text-slate-400 text-xs text-center mb-4">
                                    {severity.stage >= 4
                                        ? 'Here are two easy options — there is absolutely no pressure. You are in control.'
                                        : 'You can share this result or book a check-in session — completely your choice.'}
                                </p>
                                <div className="flex gap-3 justify-center flex-wrap">
                                    <button
                                        disabled={sharingSent}
                                        onClick={async () => {
                                            await db.sendP2PMessage({
                                                id: Date.now().toString(),
                                                senderId: userId,
                                                receiverId: 'counselor_dimple_wagle',
                                                text: `📊 I completed the ${surveyType} Wellness Odyssey and wanted to share my result with you. Score: ${surveyResult?.score}/${maxScore} (${severity.label}). Date: ${new Date().toLocaleDateString('en-IN')}.`,
                                                timestamp: new Date().toISOString(),
                                                isRead: false,
                                            });
                                            setSharingSent(true);
                                            addNotification('Score shared with your counsellor 💚', 'success');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm border border-white/20 transition-all disabled:opacity-50"
                                    >
                                        <MessageSquare size={15} />
                                        {sharingSent ? 'Shared ✓' : 'Share with counsellor'}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm border border-white/20 transition-all"
                                    >
                                        <CalendarIcon size={15} /> Book a Session
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button onClick={handleDownload} className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm border border-white/20 transition-all">
                                <Download size={16} /> Download PDF
                            </button>
                            <button onClick={onClose} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl shadow-lg transition-all hover:scale-105">
                                Close Odyssey
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── GUARDIAN + RELIC ─────────────────────────────────────────────────────
    return (
        <div className="relative w-full h-full min-h-[500px] flex flex-col overflow-hidden transition-colors duration-500 rounded-3xl"
            style={{ background: `linear-gradient(135deg, ${bgColor} 0%, #0d1117 100%)` }}>

            {/* Stars (atmospheric particles) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="absolute rounded-full bg-emerald-400 animate-pulse"
                        style={{ width: `${1 + Math.random() * 1.5}px`, height: `${1 + Math.random() * 1.5}px`, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 4}s`, opacity: healthPct * 0.6 }} />
                ))}
            </div>

            {/* Header */}
            <div className="relative z-10 px-6 pt-5 pb-3">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Shield size={18} className="text-emerald-400" />
                        <span className="text-emerald-400 font-bold text-sm">Navigator</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Star size={16} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-yellow-400 font-bold">{xp} XP</span>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs">✕ Exit</button>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Stage {currentIdx + 1} of {questions.length}</span>
                    <span>{Math.round(progress)}% Complete</span>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 relative z-10 overflow-y-auto">

                {stage === 'guardian' && currentQ && (
                    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-500">
                        {/* Realm label */}
                        <p className="text-center text-emerald-500/60 text-xs uppercase tracking-widest mb-2">{currentQ.realm}</p>

                        {/* Guardian Card */}
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 mb-6 text-center">
                            <div className="text-5xl mb-3">🔮</div>
                            <h2 className="text-white font-black text-xl mb-1">{currentQ.guardian}</h2>
                            <p className="text-slate-400 text-xs mb-4 uppercase tracking-wide">{currentQ.domain} Domain</p>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <p className="text-sm text-slate-300 italic leading-relaxed">
                                    "Navigator, over the last 2 weeks, how often have you experienced: <strong className="text-white not-italic">{currentQ.question}</strong>?"
                                </p>
                            </div>
                        </div>

                        {/* Answer Tiles */}
                        <div className="space-y-3">
                            {shuffledOptions.map(opt => (
                                <button key={opt.value} onClick={() => handleAnswer(opt.value)}
                                    disabled={animating}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${animating ? 'opacity-50' : 'hover:scale-[1.02] active:scale-95'} ${selectedAnswer === opt.value ? 'bg-white/20 border-white text-white' : 'bg-white/5 border-white/10'}`}
                                >
                                    <span className="text-2xl">{opt.emoji}</span>
                                    <span className="flex-1 text-sm font-medium text-white">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {stage === 'relic' && (
                    <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                        {/* Answered */}
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-2">✨</div>
                            <p className="text-emerald-400 font-bold">Guardian Appeased!</p>
                            <p className="text-yellow-400 text-sm">+{FREQUENCY_OPTIONS[selectedAnswer!]?.xp} XP earned</p>
                        </div>

                        {/* Relic Card */}
                        <div className="bg-emerald-900/40 border border-emerald-500/40 rounded-3xl p-6 mb-6 relative overflow-hidden">
                            <div className="absolute top-2 right-3 text-3xl opacity-20">🏺</div>
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={16} className="text-emerald-400" />
                                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Oracle's Relic</span>
                            </div>
                            {isLoadingRelic ? (
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                    The Oracle is channeling wisdom...
                                </div>
                            ) : (
                                <p className="text-white text-sm leading-relaxed">{relic}</p>
                            )}
                        </div>

                        <button onClick={advanceToNext} disabled={isLoadingRelic}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2">
                            {isLastQ ? '🗺️ View Soul Map' : <>Next Guardian <ChevronRight size={18} /></>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WellnessOdyssey;
