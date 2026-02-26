import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Calendar, BookOpen, Activity, Home, CheckSquare, Heart, Lock, User as UserIcon, LogOut, MessageSquare, XCircle, AlertCircle, Cloud, Sparkles, Key, CheckCircle, Download } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import SParshAvatar from './SParshAvatar';
import ProfileDropdown from './ProfileDropdown';
import EditProfileModal from './EditProfileModal';
import EnvironmentWidget from './EnvironmentWidget';
import { sendMessageToSParsh } from '../services/geminiService';
import { analyzeSentimentAndSchedule } from '../services/sentimentAgent';
import { Message, WellnessTask, AppointmentSlot, JournalEntry, P2PMessage, ConsentData, User } from '../types';
import ConsentForm from './ConsentForm';
import * as db from '../services/storage';
import { useSParsh } from '../contexts/SParshContext';
import { useNotification } from '../contexts/NotificationContext';
import { getUser, updateUser } from '../services/storage';

interface Props {
  triggerCrisis: () => void;
  userEmail: string;
  userId: string;
  user: User;
}

const StudentDashboard: React.FC<Props> = ({ triggerCrisis, userEmail, userId, user: initialUser }) => {
  const { addNotification } = useNotification();
  const [user, setUser] = useState<User>(initialUser);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const { setVibe, setAvatarState } = useSParsh();

  const studentName = (() => {
    const namePart = userEmail.split('.')[1]?.split('@')[0];
    if (!namePart) return 'Student';
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  })();
  
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'booking'>('home');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Error States
  const [apiError, setApiError] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Profile State
  const [showProfile, setShowProfile] = useState(false);

  // Dynamic Data States
  const [tasks, setTasks] = useState<WellnessTask[]>([]);

  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);



  // P2P Chat States
  const [showP2P, setShowP2P] = useState(false);
  const [p2pMessages, setP2PMessages] = useState<P2PMessage[]>([]);
  const [p2pInput, setP2PInput] = useState('');

  // Load Data
  

  useEffect(() => {
    const loadData = async () => {
        setIsCloudSyncing(true);
        const history = await db.getChatHistory(userId);
        setMessages(history);
        setTasks(await db.getTasks(userEmail));

        setSlots(await db.getSlots());
        setIsCloudSyncing(false);
    };
    loadData();
    // Poll slots every 5s
    const interval = setInterval(async () => {
        setSlots(await db.getSlots());
        if(showP2P) {
            setP2PMessages(await db.getP2PThread(userId, 'counselor_dimple'));
        }
    }, 5000); 
    return () => clearInterval(interval);
  }, [userId, userEmail, showP2P]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages]);



  const processMessageSend = async (textToSend: string) => {
      setAvatarState('listening');
      setIsLoading(true);
      setApiError(false);
      
      const validHistory = messages.filter(m => !m.text.includes("Token Limit Reached"));
      const history = validHistory.map(m => ({ role: m.role === 'agent' ? 'model' : m.role, parts: [{ text: m.text }] }));
      
      const response = await sendMessageToSParsh(history, textToSend, true);
      
      setIsLoading(false);
      setAvatarState('speaking');

      // Update UI based on which model was used
      setIsFallbackMode(response.modelUsed === 'fallback');
      
      // Check for API Configuration Error (400/403/Invalid Key)
      if (response.text.includes("API key not valid") || response.text.includes("System Error")) {
          setApiError(true);
      }

      // Success
      if (response.detectedMood) setVibe(response.detectedMood);
      if (response.isCrisis) triggerCrisis();

      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: response.text, timestamp: new Date() };
      const updatedMessages = [...validHistory, 
            { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: new Date() } as Message, 
            modelMsg
      ];
      setMessages(updatedMessages);
      
      setIsCloudSyncing(true);
      await db.saveChatMessage(userId, modelMsg);
      setIsCloudSyncing(false);

      // --- TRIGGER AUTONOMOUS AGENT (SLM) ---
      analyzeSentimentAndSchedule(userId, userEmail, updatedMessages).then(async (agentMsg) => {
         if (agentMsg) {
             if (agentMsg.metadata?.type === 'crisis_trigger') triggerCrisis();
             if (agentMsg.metadata?.type === 'task_assignment') setTasks(await db.getTasks(userEmail));
             if (agentMsg.metadata?.type === 'booking_confirmation') setSlots(await db.getSlots());
             setMessages(prev => [...prev, agentMsg]);
             await db.saveChatMessage(userId, agentMsg);
         }
      });
      
      setTimeout(() => setAvatarState('idle'), 3000);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    
    setIsCloudSyncing(true);
    await db.saveChatMessage(userId, userMsg);
    setIsCloudSyncing(false);
    
    await processMessageSend(textToSend);
  };

  const toggleTask = async (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
    await db.toggleTaskCompletion(userEmail, id);
  };

  const handleBookSlot = (slot: AppointmentSlot) => {
    setSelectedSlot(slot);
    setShowConsentModal(true);
  };

    const handleConsentSubmit = async (signature: string | File, mobile?: string) => {
    if (mobile) {
      await handleProfileSave({ mobile });
    }
    if (!selectedSlot) return;

    let signatureData = '';
    if (signature instanceof File) {
      const reader = new FileReader();
      reader.readAsDataURL(signature);
      reader.onload = async () => {
        signatureData = reader.result as string;
        await completeBooking(signatureData);
      };
    } else {
      signatureData = signature;
      await completeBooking(signatureData);
    }
  };

  const completeBooking = async (signatureData: string) => {
    if (!selectedSlot) return;

    const consent: Omit<ConsentData, 'counselorSignature' | 'counselorSignDate' | 'counselorId' | 'counselorName'> = {
      slotId: selectedSlot.id,
      studentId: userId,
      studentName: studentName,
      studentSignature: signatureData,
      studentSignDate: new Date().toISOString(),
    };

    await db.saveConsent(consent as ConsentData);

    setIsCloudSyncing(true);
    const success = await db.requestSlot(selectedSlot.id, userId, studentName);
    setIsCloudSyncing(false);

    if (success) {
      setSlots(await db.getSlots());
      addNotification('Slot requested successfully!', 'success');
    } else {
      addNotification('Failed to request slot.', 'error');
    }

    setShowConsentModal(false);
    setSelectedSlot(null);
  }

    const handleDownloadConsent = async (slotId: string) => {
    const consent = await db.getConsentForSlot(slotId);
    if (consent) {
      const blob = new Blob([JSON.stringify(consent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consent-form-${consent.studentName.replace(/ /g, '_')}-${consent.slotId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCancelSlot = async (slotId: string) => {
      addNotification('Slot booking cancelled', 'info');
      setIsCloudSyncing(true);
      await db.updateSlotStatus(slotId, 'open');
      setSlots(await db.getSlots());
      setIsCloudSyncing(false);
  };



    const handleProfileSave = async (updatedDetails: Partial<User>) => {
    await updateUser(user.id, updatedDetails);
    const updatedUser = await getUser(user.id);
    if (updatedUser) {
      setUser(updatedUser);
    }
    setShowEditProfileModal(false);
  };

  const handleP2PSend = async () => {
      if(!p2pInput.trim()) return;
      await db.sendP2PMessage({
          id: Date.now().toString(),
          senderId: userId,
          receiverId: 'counselor_dimple',
          text: p2pInput,
          timestamp: new Date().toISOString(),
          isRead: false
      });
      setP2PInput('');
      setP2PMessages(await db.getP2PThread(userId, 'counselor_dimple'));
  };

  const data = [
    { name: 'Mon', stress: 40 },
    { name: 'Tue', stress: 60 },
    { name: 'Wed', stress: 75 },
    { name: 'Thu', stress: 90 },
    { name: 'Fri', stress: 50 },
    { name: 'Sat', stress: 30 },
    { name: 'Sun', stress: 20 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#E6DDD0]">
      {/* Top Header */}
      <div className="w-full bg-[#DCD4C4] p-4 flex justify-between items-center shadow-md z-20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#8A9A5B] flex items-center justify-center text-white font-bold text-xl">
            SU
          </div>
          <div>
            <h1 className="font-bold text-lg text-[#708090]">SpeakUp</h1>
            <p className="text-sm text-slate-500">Hi, {studentName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowP2P(true)} className="neu-icon-btn p-3 rounded-full text-[#708090]">
            <MessageSquare size={20} />
          </button>
                    <ProfileDropdown 
            user={user} 
            onEditProfile={() => setShowEditProfileModal(true)} 
            onLogout={() => window.location.reload()} 
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-[#DCD4C4] p-6 flex-col hidden md:flex">
          <div className="space-y-4">
            <button onClick={() => setActiveTab('home')} className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${activeTab === 'home' ? 'neu-pressed text-[#8A9A5B]' : 'text-slate-500 hover:bg-black/5'}`}><Home size={20} /> Home</button>
            <button onClick={() => setActiveTab('tasks')} className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${activeTab === 'tasks' ? 'neu-pressed text-[#8A9A5B]' : 'text-slate-500 hover:bg-black/5'}`}><CheckSquare size={20} /> Tasks</button>
            <button onClick={() => setActiveTab('booking')} className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${activeTab === 'booking' ? 'neu-pressed text-[#8A9A5B]' : 'text-slate-500 hover:bg-black/5'}`}><Calendar size={20} /> Slot Booking</button>
          </div>
        </div>

      {/* API Error Banner - Handles Token Expiry */}
      {apiError && (
          <div className="mx-4 mb-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 animate-in slide-in-from-top shadow-md">
              <Key size={20} className="mt-1 flex-shrink-0" />
              <div>
                  <h3 className="font-bold text-sm">Authentication Error</h3>
                  <p className="text-xs">The AI Token has expired. Please update <code>process.env.API_KEY</code> or retry later.</p>
              </div>
          </div>
      )}

      {/* P2P Chat Modal */}
      {showP2P && (
          <div className="absolute inset-0 z-40 bg-[#E6DDD0] flex flex-col animate-in slide-in-from-bottom duration-300">
              <div className="p-4 border-b border-gray-300 flex justify-between items-center bg-white/50">
                  <h3 className="font-bold text-[#708090]">Counselor Chat (Encrypted)</h3>
                  <button onClick={() => setShowP2P(false)}><XCircle className="text-slate-400"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {p2pMessages.map(m => (
                      <div key={m.id} className={`flex ${m.senderId === userId ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.senderId === userId ? 'bg-[#8A9A5B] text-white' : 'bg-white text-slate-600'}`}>
                              {m.text}
                          </div>
                      </div>
                  ))}
                  {p2pMessages.length === 0 && <p className="text-center text-slate-400 text-xs mt-10">Start a secure conversation with your counselor.</p>}
              </div>
              <div className="p-4 bg-white/50">
                  <div className="flex gap-2">
                                            <input type="text" value={p2pInput} onChange={e => setP2PInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleP2PSend()} placeholder="Type a message..." className="flex-1 p-2 rounded-lg border border-gray-300 outline-none" />
                      <button onClick={handleP2PSend} className="bg-[#8A9A5B] text-white p-2 rounded-lg"><Send size={18}/></button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
        {activeTab === 'home' && (
          <div className="w-full">
            <EnvironmentWidget variant="student" />
            <div className="neu-pressed rounded-3xl p-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#708090] flex items-center gap-2"><Activity size={16}/> Workload Meter</h3>
                <span className="text-xs bg-[#CC5500]/10 text-[#CC5500] px-2 py-1 rounded-full">Peak Load</span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <Tooltip />
                    <Area type="monotone" dataKey="stress" stroke="#CC5500" fillOpacity={0.2} fill="#CC5500" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
           <div className="animate-in slide-in-from-bottom-10 duration-500 space-y-6">
             <h2 className="text-2xl font-bold text-[#708090]">Wellness Routines</h2>

             {tasks.length === 0 && <p className="text-center text-slate-400 mt-10">No tasks assigned yet.</p>}
             <div className="space-y-4">
               {tasks.map(task => (
                 <div key={task.id} onClick={() => toggleTask(task.id)} className={`p-4 rounded-2xl flex items-center gap-4 transition-all cursor-pointer ${task.isCompleted ? 'neu-pressed opacity-60' : 'neu-flat'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.isCompleted ? 'border-[#8A9A5B] bg-[#8A9A5B]' : 'border-slate-400'}`}>
                      {task.isCompleted && <CheckSquare size={14} className="text-white"/>}
                    </div>
                    <div>
                       <h4 className={`font-bold ${task.isCompleted ? 'text-slate-400 line-through' : 'text-[#708090]'}`}>{task.title}</h4>
                       <p className="text-xs text-slate-400">Assigned by {task.assignedBy}</p>
                    </div>
                 </div>
               ))}
             </div>
           </div>
        )}



      {showConsentModal && selectedSlot && (
        <ConsentForm 
          role="student"
          studentName={studentName}
          program="PGDM"
          onClose={() => setShowConsentModal(false)}
                    onSubmit={handleConsentSubmit}
          user={user}
        />
      )}

              {showEditProfileModal && (
        <EditProfileModal 
          user={user} 
          onClose={() => setShowEditProfileModal(false)} 
          onSave={handleProfileSave} 
        />
      )}

        {activeTab === 'booking' && (
          <div className="animate-in slide-in-from-right-10 duration-500 space-y-4">
            <h3 className="text-xl font-bold text-[#708090] mb-6">Book a Sanctuary Slot</h3>
            {slots.map(slot => {
                const isMyBooking = slot.bookedByStudentId === userId;
                let btnText = 'Select';
                let btnClass = 'bg-[#E6DDD0] text-[#8A9A5B] border border-[#8A9A5B]';
                let statusText = '';
                
                if (slot.status === 'confirmed') {
                    btnText = isMyBooking ? 'Confirmed' : 'Taken';
                    btnClass = isMyBooking ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400';
                    statusText = isMyBooking ? 'Slot Confirmed' : '';
                } else if (slot.status === 'requested') {
                    btnText = isMyBooking ? 'Cancel Req' : 'Pending';
                    btnClass = isMyBooking ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-400';
                    statusText = isMyBooking ? 'Waiting Approval' : '';
                }

                return (
                  <div key={slot.id} className="neu-flat p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#708090]">{slot.counselorName}</div>
                      <div className="text-sm text-slate-400">{slot.date} • {slot.time}</div>
                      {statusText && <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">{statusText}</div>}
                    </div>
                                        <div className="flex items-center gap-2">
                      {isMyBooking && slot.status === 'confirmed' && (
                        <button onClick={() => handleDownloadConsent(slot.id)} className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300">
                          <Download size={16} />
                        </button>
                      )}
                      <button 
                        disabled={slot.status !== 'open' && !isMyBooking} 
                        onClick={() => {
                            if (slot.status === 'open') handleBookSlot(slot);
                            if (isMyBooking && slot.status === 'requested') handleCancelSlot(slot.id);
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 ${btnClass}`}>
                        {btnText}
                      </button>
                    </div>
                  </div>
                );
            })}
          </div>
        )}
        </div>
      </div>



        {/* Floating Chat Button and Window */}
        <div className="fixed bottom-8 right-8 z-30">
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-16 h-16 rounded-full bg-[#8A9A5B] flex items-center justify-center shadow-lg text-white animate-pulse">
            <Heart size={32} fill="white" />
          </button>
        </div>

        {isChatOpen && (
          <div className="fixed bottom-28 right-8 w-96 h-[60vh] bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col z-30 animate-in slide-in-from-bottom-10 duration-500">
            <div className="p-4 border-b font-bold text-center text-[#708090]">SParsh AI</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-[#8A9A5B] text-white' : 'bg-gray-200 text-slate-700'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && <div className="text-center text-xs text-slate-400 animate-pulse">SParsh is listening...</div>}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input 
                  type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Speak to SParsh..."
                  className="flex-1 p-2 rounded-lg border border-gray-300 outline-none"
                />
                <button onClick={handleSend} className="bg-[#8A9A5B] text-white p-2 rounded-lg"><Send size={18}/></button>
              </div>
            </div>
          </div>
        )}

      {/* Bottom Navigation (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#DCD4C4] border-t border-gray-300 p-2 flex justify-around items-center z-20">
         <button onClick={() => setActiveTab('home')} className={`p-2 rounded-full transition-colors ${activeTab === 'home' ? 'text-[#8A9A5B]' : 'text-slate-500'}`}><Home size={24} /></button>
         <button onClick={() => setActiveTab('tasks')} className={`p-2 rounded-full transition-colors ${activeTab === 'tasks' ? 'text-[#8A9A5B]' : 'text-slate-500'}`}><CheckSquare size={24} /></button>
         <button onClick={() => setActiveTab('booking')} className={`p-2 rounded-full transition-colors ${activeTab === 'booking' ? 'text-[#8A9A5B]' : 'text-slate-500'}`}><Calendar size={24} /></button>
      </div>
    </div>
  );
};

export default StudentDashboard;