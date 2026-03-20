import React, { useState, useEffect, useRef } from 'react';
import { Send, XCircle } from 'lucide-react';
import { useFirebaseChat } from '../hooks/useFirebaseChat';

export interface ChatWidgetProps {
  currentUserId: string;
  targetUserId: string;
  targetUserName?: string;
  onClose: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ currentUserId, targetUserId, targetUserName = 'User', onClose }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, remoteTyping, sendMessage, notifyTyping } = useFirebaseChat({
    userId: currentUserId,
    otherUserId: targetUserId
  });

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    notifyTyping();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, remoteTyping]);

  return (
    <div className="fixed bottom-24 right-4 md:right-8 w-full max-w-[92vw] sm:max-w-96 h-[65vh] max-h-[550px] z-[300] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-col justify-center items-center bg-slate-50 relative">
        <button onClick={onClose} className="absolute right-4 top-4 bg-white p-2 rounded-full shadow-sm hover:scale-105 transition-all">
          <XCircle className="text-slate-500 hover:text-red-500" size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <h3 className="font-bold text-slate-800 text-lg">Chat with {targetUserName}</h3>
        </div>
        <p className="text-xs text-slate-500 font-medium">Secured by Firebase</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
        {messages.map((m) => {
          const isSender = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-xl text-sm ${isSender ? 'bg-[#8a6b5c] text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                {m.text}
              </div>
            </div>
          );
        })}
        {remoteTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-500 p-3 rounded-xl text-sm italic border border-slate-200">
              Typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 p-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-[#8a6b5c]/50"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="bg-[#8a6b5c] text-white p-2 rounded-lg disabled:opacity-50 transition-opacity"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
