
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Copy, Check, X } from 'lucide-react';
import { createChallenge } from '../services/challengeService';
import { Question } from '../types';

interface ChallengeCreatorProps {
  score: number;
  questions: Question[];
  topic: string;
  onClose: () => void;
}

export const ChallengeCreator: React.FC<ChallengeCreatorProps> = ({ score, questions, topic, onClose }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const id = await createChallenge(name, topic, questions, score);
      // Generate Link
      const url = `${window.location.origin}?challengeId=${id}`;
      setLink(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
        
        <div className="text-center mb-6">
           <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Swords size={32} />
           </div>
           <h2 className="text-2xl font-bold text-slate-800">Tantang Teman!</h2>
           <p className="text-sm text-slate-500 mt-2">Kirim quiz ini ke temanmu. Bisakah mereka mengalahkan skormu <span className="font-bold text-violet-600">{score}</span>?</p>
        </div>

        {!link ? (
           <div className="space-y-4">
              <div>
                 <label className="text-xs font-bold uppercase text-slate-400">Nama Kamu (Sang Penantang)</label>
                 <input 
                   type="text" 
                   value={name}
                   onChange={e => setName(e.target.value)}
                   placeholder="e.g. Raja Kuis"
                   className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 mt-1 font-bold text-slate-700 focus:border-violet-500 outline-none"
                   autoFocus
                 />
              </div>
              
              {error && <p className="text-xs text-rose-500 bg-rose-50 p-2 rounded-lg">{error}</p>}

              <button 
                onClick={handleCreate}
                disabled={!name || loading}
                className="w-full bg-violet-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-violet-500/30 hover:bg-violet-700 disabled:opacity-50 transition-all"
              >
                 {loading ? "Membuat Arena..." : "Buat Link Tantangan"}
              </button>
           </div>
        ) : (
           <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 break-all text-xs text-slate-500 font-mono">
                 {link}
              </div>
              <button 
                onClick={copyLink}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                 {copied ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
                 {copied ? "Link Disalin!" : "Salin Link"}
              </button>
              <p className="text-[10px] text-center text-slate-400">Link ini berlaku selama data ada di Supabase.</p>
           </div>
        )}
      </motion.div>
    </div>
  );
};
