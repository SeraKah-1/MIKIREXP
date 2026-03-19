
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, CheckCircle2, Circle, Shuffle, Play, Layers, Sparkles, Plus } from 'lucide-react';
import { getSavedQuizzes } from '../services/storageService';
import { GlassButton } from './GlassButton';
import { Question } from '../types';
import { transformToMixed } from '../services/questionTransformer';

interface VirtualRoomProps {
  onStartMix: (questions: Question[]) => void;
  onStartFlashcards: (questions: Question[]) => void;
}

export const VirtualRoom: React.FC<VirtualRoomProps> = ({ onStartMix, onStartFlashcards }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isVariedMode, setIsVariedMode] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      const data = await getSavedQuizzes();
      setHistory(data);
    };
    loadData();
  }, []);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleStart = (mode: 'quiz' | 'flashcards' = 'quiz') => {
    const selectedQuizzes = history.filter(h => selectedIds.includes(h.id));
    let combinedQuestions: Question[] = [];
    selectedQuizzes.forEach(quiz => {
       if (Array.isArray(quiz.questions)) {
          combinedQuestions = [...combinedQuestions, ...quiz.questions];
       }
    });
    combinedQuestions = combinedQuestions.sort(() => Math.random() - 0.5);
    if (isVariedMode) {
       combinedQuestions = transformToMixed(combinedQuestions);
    }
    const finalQuestions = combinedQuestions.map((q, idx) => ({ ...q, id: idx + 1 }));
    
    if (mode === 'flashcards') {
      onStartFlashcards(finalQuestions);
    } else {
      onStartMix(finalQuestions);
    }
  };

  const totalQuestions = history
    .filter(h => selectedIds.includes(h.id))
    .reduce((acc, curr) => acc + (curr.questionCount || 0), 0);

  return (
    <div className="max-w-5xl mx-auto pt-8 pb-24 px-4 min-h-[80vh]">
      <div className="text-center mb-10">
         <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
           <h1 className="text-4xl font-black text-theme-text flex items-center justify-center tracking-tight">
             <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 to-purple-600">Virtual Mixer</span>
           </h1>
           <p className="text-slate-500 mt-2 font-medium">
             Campur aduk soal lama jadi ujian baru.
           </p>
         </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* LEFT: QUIZ LIST */}
         <div className="lg:col-span-2 space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {history.map((quiz, idx) => {
               const isSelected = selectedIds.includes(quiz.id);
               return (
                 <motion.div 
                   key={`${quiz.id}-${idx}`}
                   initial={{ x: -20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   transition={{ delay: idx * 0.05 }}
                   onClick={() => toggleSelection(quiz.id)}
                   className={`
                     relative p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group
                     ${isSelected 
                       ? 'bg-white border-purple-500 shadow-md ring-1 ring-purple-500' 
                       : 'bg-white/60 border-transparent hover:bg-white hover:shadow-sm'}
                   `}
                 >
                    <div className="flex items-center space-x-4">
                       <div className={`
                         p-3 rounded-xl transition-colors
                         ${isSelected ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-500'}
                       `}>
                          <Layers size={20} />
                       </div>
                       <div>
                          <h3 className={`font-bold text-sm ${isSelected ? 'text-purple-900' : 'text-slate-700'}`}>
                            {quiz.fileName}
                          </h3>
                          <p className="text-xs text-slate-500">{quiz.questionCount} Soal • {new Date(quiz.date).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="pr-2">
                       {isSelected 
                         ? <CheckCircle2 className="text-purple-500" size={24} />
                         : <Plus className="text-slate-300 group-hover:text-purple-400" size={24} />
                       }
                    </div>
                 </motion.div>
               )
            })}
         </div>

         {/* RIGHT: THE MIXER BOWL */}
         <div className="lg:col-span-1">
            <div className="bg-white/70 backdrop-blur-xl border border-white p-6 rounded-[2.5rem] shadow-xl sticky top-6">
               
               {/* VISUAL BOWL ANIMATION */}
               <div className="relative h-32 mb-6 flex items-center justify-center">
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-purple-100 to-fuchsia-100 rounded-b-[3rem] border border-purple-200/50 flex items-center justify-center overflow-hidden">
                      {/* Icons falling in */}
                      <AnimatePresence>
                        {selectedIds.map((id, i) => (
                            <motion.div
                                key={id}
                                initial={{ y: -50, opacity: 0, rotate: 0 }}
                                animate={{ y: 10, opacity: 1, rotate: Math.random() * 360 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", bounce: 0.5 }}
                                className="absolute bg-white p-2 rounded-full shadow-sm text-purple-500"
                                style={{ left: `${20 + (i * 10) % 60}%` }}
                            >
                                <Layers size={16} />
                            </motion.div>
                        ))}
                      </AnimatePresence>
                      {selectedIds.length === 0 && <span className="text-xs text-purple-300 font-bold uppercase">Bowl Kosong</span>}
                  </div>
               </div>

               <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm text-slate-500">
                     <span>Quiz Dipilih</span>
                     <span className="font-bold text-slate-800">{selectedIds.length}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-500">
                     <span>Total Soal</span>
                     <span className="font-black text-purple-600 text-lg">{totalQuestions}</span>
                  </div>
               </div>

               <div 
                 onClick={() => setIsVariedMode(!isVariedMode)}
                 className={`p-4 rounded-2xl border cursor-pointer transition-all mb-6 flex items-center justify-between ${isVariedMode ? 'bg-fuchsia-50 border-fuchsia-300' : 'bg-slate-50 border-transparent hover:bg-white'}`}
               >
                  <div className="flex items-center">
                     <div className={`p-2 rounded-lg mr-3 ${isVariedMode ? 'bg-fuchsia-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        <Sparkles size={18} />
                     </div>
                     <div>
                        <span className={`block text-xs font-bold ${isVariedMode ? 'text-fuchsia-700' : 'text-slate-500'}`}>Auto-Remix</span>
                        <span className="text-[9px] text-slate-400">Ubah tipe soal (T/F & Isian)</span>
                     </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isVariedMode ? 'bg-fuchsia-500' : 'bg-slate-300'}`}>
                     <motion.div className="w-4 h-4 bg-white rounded-full shadow-sm" animate={{ x: isVariedMode ? 16 : 0 }} />
                  </div>
               </div>

               <div className="flex gap-3">
                  <button 
                      onClick={() => handleStart('flashcards')} 
                      disabled={selectedIds.length < 2}
                      className="btn-tactile flex-1 py-4 bg-white border-slate-200 text-slate-700 rounded-2xl font-bold shadow-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                  >
                       <Layers size={20} className="mr-2" /> Flashcards
                  </button>
                  <button 
                      onClick={() => handleStart('quiz')} 
                      disabled={selectedIds.length < 2}
                      className="btn-tactile flex-[2] py-4 bg-slate-900 border-slate-700 text-white rounded-2xl font-bold shadow-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                  >
                       <Play size={20} className="mr-2 fill-current" /> Start Mixer
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
