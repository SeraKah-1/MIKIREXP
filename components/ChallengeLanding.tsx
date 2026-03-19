
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Trophy, User, ArrowRight } from 'lucide-react';
import { ChallengeData } from '../types';

interface ChallengeLandingProps {
  data: ChallengeData;
  onAccept: (challengerName: string) => void;
}

export const ChallengeLanding: React.FC<ChallengeLandingProps> = ({ data, onAccept }) => {
  const [name, setName] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
       <motion.div 
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="bg-white/90 backdrop-blur-xl border border-white/50 p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl text-center relative overflow-hidden"
       >
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-violet-100/50 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
             <div className="inline-block p-4 bg-white rounded-2xl shadow-lg mb-6 transform -rotate-6">
                <Swords size={48} className="text-violet-600" />
             </div>
             
             <h1 className="text-3xl font-black text-slate-800 mb-2">CHALLENGE!</h1>
             <p className="text-slate-500 mb-8">
                <span className="font-bold text-slate-800">{data.creatorName}</span> menantang kamu untuk mengalahkan skornya di topik:
                <br/>
                <span className="inline-block bg-violet-100 text-violet-700 px-2 py-1 rounded-lg text-sm font-bold mt-2">{data.topic}</span>
             </p>

             <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Trophy size={20} /></div>
                   <div className="text-left">
                      <p className="text-xs text-slate-400 font-bold uppercase">Target Skor</p>
                      <p className="text-xl font-black text-slate-800">{data.creatorScore}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-xs text-slate-400 font-bold uppercase">Soal</p>
                   <p className="text-xl font-black text-slate-800">{data.questions.length}</p>
                </div>
             </div>

             <div className="space-y-4">
                <div className="relative">
                   <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
                   <input 
                     type="text" 
                     value={name}
                     onChange={e => setName(e.target.value)}
                     placeholder="Masukkan Nama Kamu..."
                     className="w-full bg-white border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-700 focus:border-violet-500 outline-none"
                   />
                </div>
                <button 
                  onClick={() => name && onAccept(name)}
                  disabled={!name}
                  className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                   Terima Tantangan <ArrowRight className="ml-2" />
                </button>
             </div>
          </div>
       </motion.div>
    </div>
  );
};
