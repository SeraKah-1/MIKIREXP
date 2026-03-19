import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, FileText, ArrowLeft } from 'lucide-react';
import { chatWithDocument } from '../services/geminiService';
import { getApiKey } from '../services/storageService';
import { AiProvider } from '../types';

interface ChatScreenProps {
  contextText: string;
  sourceFile: File | null;
  onClose: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ contextText, sourceFile, onClose }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: `Halo! Saya sudah membaca ${sourceFile ? sourceFile.name : 'topik ini'}. Ada yang ingin didiskusikan?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const apiKey = getApiKey('gemini');
    
    // Convert simplified messages to API history format
    const apiHistory = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    try {
      if (!apiKey) throw new Error("API Key missing");
      
      const response = await chatWithDocument(
        apiKey,
        'gemini-2.5-flash', // Use Gemini for reasoning context
        apiHistory,
        userMsg,
        contextText,
        sourceFile
      );

      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Maaf, terjadi kesalahan koneksi." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col md:max-w-md md:right-0 md:left-auto md:border-l border-slate-200 shadow-2xl">
       {/* Header */}
       <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/50">
         <div className="flex items-center space-x-3">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <ArrowLeft size={20} className="text-slate-500" />
            </button>
            <div>
              <h2 className="font-bold text-slate-800 flex items-center">
                <Bot size={18} className="mr-2 text-indigo-500" /> Assistant
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-[150px]">
                {sourceFile ? sourceFile.name : "Topik Diskusi"}
              </p>
            </div>
         </div>
       </div>

       {/* Chat Area */}
       <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
         {messages.map((msg, idx) => (
           <motion.div 
             key={idx}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
           >
             <div className={`
               max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed
               ${msg.role === 'user' 
                 ? 'bg-indigo-600 text-white rounded-br-none' 
                 : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}
             `}>
               {msg.text}
             </div>
           </motion.div>
         ))}
         {loading && (
           <div className="flex justify-start">
             <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex space-x-1">
               <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
               <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75" />
               <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150" />
             </div>
           </div>
         )}
         <div ref={scrollRef} />
       </div>

       {/* Input Area */}
       <div className="p-4 bg-white border-t border-slate-100">
         <div className="relative">
           <input 
             type="text" 
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             placeholder="Tanya tentang materi..."
             className="w-full bg-slate-100 border-none rounded-full px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
           />
           <button 
             onClick={handleSend}
             disabled={loading || !input.trim()}
             className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
           >
             <Send size={16} />
           </button>
         </div>
       </div>
    </div>
  );
};