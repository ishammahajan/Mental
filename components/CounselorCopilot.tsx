import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Shield, FileText, BookOpen, AlertTriangle, Loader2 } from 'lucide-react';
import { sendMessageToSParsh } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import { Message } from '../types';
import { queryCounselorKnowledge } from '../services/pineconeService';

interface CopilotProps {
    counselorName: string;
}

export default function CounselorCopilot({ counselorName }: CopilotProps) {
    const [input, setInput] = useState('');
    // Use Message type instead of P2PMessage since this is local assistant state, not user-to-user chat
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'model',
            text: `Hello Dr. ${counselorName.split(' ').pop()}. I'm SParsh Copilot. I have access to SPeakUp logs, SPJIMR institutional policies, and CBT/DBT frameworks. How can I assist you today?`,
            timestamp: new Date(),
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            // Query Pinecone + Offline Fallback for Counselor Data
            let ragContext = '';
            try {
                const tools = await queryCounselorKnowledge(userMsg.text, 2);
                if (tools.length > 0) {
                    ragContext = `\n\n[RAG KNOWLEDGE BASE RECALLED]:\n` + tools.map((t: any) => `- ${t.title || 'Reference'}: ${t.text}`).join('\n');
                }
            } catch (err) {
                console.warn('Copilot RAG extraction failed', err);
            }

            const copilotPrompt = `
You are SParsh Copilot, an AI assistant explicitly designed to help SPJIMR psychological counselors.
You are interacting with Dr. ${counselorName}.
Your knowledge includes:
- SPJIMR Student Guidelines and escalation protocols
- Evidence-based CBT (Cognitive Behavioral Therapy) and DBT (Dialectical Behavior Therapy) practices
- SPeakUp platform analytics

Provide a professional, concise, and academically sound response to the counselor's inquiry.
Do NOT act like a therapist for the counselor; act as a clinical assistant and knowledge base.
Use Markdown for formatting.
${ragContext}

Counselor Query:
${userMsg.text}
`;

            // Use the service. Pass empty history, the prompt as the new message, and the signal.
            const response = await sendMessageToSParsh(
                [],
                copilotPrompt,
                abortControllerRef.current.signal
            );

            if (!abortControllerRef.current.signal.aborted) {
                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'model',
                    text: response.text,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                const errorMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'model',
                    text: '⚠️ Copilot encountered an error connecting to the knowledge base. Please check your network or API keys.',
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMsg]);
            }
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                        <Bot size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            Counselor Copilot <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Beta</span>
                        </h3>
                        <p className="text-xs text-slate-500">RAG-powered clinical assistant</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Knowledge Base Indicators */}
                <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/50 mb-6 flex flex-wrap gap-2 text-[10px] font-bold text-indigo-700">
                    <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm opacity-80"><Shield size={12} /> SPJIMR Protocols loaded</span>
                    <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm opacity-80"><BookOpen size={12} /> CBT/DBT Literature loaded</span>
                    <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm opacity-80"><FileText size={12} /> Case Analytics active</span>
                </div>

                {messages.map((m) => {
                    const isModel = m.role === 'model';
                    return (
                        <div key={m.id} className={`flex ${isModel ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${isModel ? 'bg-white border border-gray-200 text-slate-700' : 'bg-indigo-600 text-white'}`}>
                                {isModel ? (
                                    <div className="text-sm prose prose-sm max-w-none prose-p:leading-relaxed prose-a:text-indigo-600 prose-headings:text-slate-800">
                                        <MarkdownRenderer content={m.text} />
                                    </div>
                                ) : (
                                    <div className="text-sm">{m.text}</div>
                                )}
                                <div className={`text-[10px] mt-2 opacity-60 text-right ${isModel ? 'text-slate-400' : 'text-indigo-200'}`}>
                                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-2 text-slate-500 text-sm">
                            <Loader2 size={16} className="animate-spin text-indigo-600" />
                            Copilot is analyzing...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
                <div className="relative flex items-center">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask Copilot for clinical resources, policy details, or risk assessment..."
                        className="w-full bg-gray-50 border border-gray-200 text-slate-700 text-sm rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none h-12 flex items-center scrollbar-hide"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={16} />
                    </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 mt-2 flex items-center justify-center gap-1">
                    <AlertTriangle size={10} /> Copilot provides suggestions based on RAG embeddings. Always verify critical protocols.
                </p>
            </div>
        </div>
    );
}
