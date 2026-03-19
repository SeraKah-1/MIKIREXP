
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, CornerDownLeft, Type, ToggleLeft, Lightbulb, Clock } from 'lucide-react';
import { Question } from '../types';
import { useGameSound } from '../hooks/useGameSound';

interface UniversalCardProps {
  question: Question;
  isAnswered: boolean;
  userAnswer: any;
  onAnswer: (answer: any, isCorrect: boolean) => void;
  onNext?: () => void;
}

// Improved Renderer with highlighting
const RenderText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Highlight style
          return <span key={i} className="font-bold text-indigo-900 bg-indigo-100/50 px-1 rounded mx-0.5">{part.slice(2, -2)}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export const UniversalQuestionCard: React.FC<UniversalCardProps> = ({
  question, isAnswered, userAnswer, onAnswer, onNext
}) => {
  const { playHover } = useGameSound();
  const [textInput, setTextInput] = useState("");
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (userAnswer && typeof userAnswer === 'string') {
        setTextInput(userAnswer);
    } else {
        setTextInput("");
    }
  }, [question.id, userAnswer]);

  useEffect(() => {
    setShowHint(false);
  }, [question.id]);

  // --- RENDERER: MULTIPLE CHOICE (TACTILE) ---
  const renderMCQ = () => {
    const options = question.options || []; // Fallback for old/corrupt graveyard data
    
    return (
    <div className="grid grid-cols-1 gap-4 w-full">
      {options.map((option, idx) => {
        const isSelected = userAnswer === idx;
        const isCorrect = question.correctIndex === idx;
        
        let containerClass = "bg-white border-slate-200 text-slate-600 hover:border-slate-300";
        let badgeClass = "bg-slate-100 text-slate-500 group-hover:bg-white";
        
        if (isAnswered) {
            if (isCorrect) {
                containerClass = "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500 shadow-none transform-none";
                badgeClass = "bg-emerald-200 text-emerald-700";
            } else if (isSelected) {
                containerClass = "bg-rose-50 border-rose-400 text-rose-800 shadow-none transform-none";
                badgeClass = "bg-rose-200 text-rose-700";
            } else {
                containerClass = "bg-slate-50 border-transparent opacity-50 shadow-none transform-none";
                badgeClass = "bg-slate-100 text-slate-400";
            }
        }

        return (
          <button
            key={idx}
            data-option-index={idx}
            disabled={isAnswered}
            onClick={() => onAnswer(idx, idx === question.correctIndex)}
            onMouseEnter={!isAnswered ? playHover : undefined}
            className={`
                group relative w-full p-4 rounded-2xl text-left flex items-start gap-4
                btn-tactile
                ${containerClass}
            `}
          >
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${badgeClass}`}>
                {['A','B','C','D'][idx]}
            </span>
            <span className="text-base font-medium leading-relaxed flex-1 py-1">
                <RenderText text={option} />
            </span>
            {isAnswered && isSelected && !isCorrect && <X className="text-rose-500 shrink-0 mt-1" size={24} strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
  };

  // --- RENDERER: TRUE / FALSE (TACTILE) ---
  const renderTrueFalse = () => (
    <div className="w-full">
        <div className="mb-8 p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-indigo-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Pernyataan</span>
            <div className="font-serif text-2xl md:text-4xl text-slate-800 leading-snug italic">
                "<RenderText text={question.proposedAnswer || ''} />"
            </div>
        </div>
        <div className="flex gap-4 h-32">
            {[
            { label: "Benar", val: 0, color: "emerald", icon: Check, border: "border-emerald-500" },
            { label: "Salah", val: 1, color: "rose", icon: X, border: "border-rose-500" }
            ].map((opt) => {
                const isCorrect = question.correctIndex === opt.val;
                const isSelected = userAnswer === opt.val;
                
                let activeClass = `bg-white border-slate-200 text-slate-400 hover:border-${opt.color}-200 hover:text-${opt.color}-500`;
                
                if (isAnswered) {
                    if (isCorrect) activeClass = `bg-${opt.color}-50 border-${opt.color}-500 text-${opt.color}-700 shadow-none transform-none`;
                    else if (isSelected) activeClass = `bg-${opt.color}-50 border-${opt.color}-400 text-${opt.color}-700 opacity-60 shadow-none transform-none`;
                    else activeClass = "opacity-20 border-transparent bg-slate-100 shadow-none transform-none";
                }

                return (
                    <button
                        key={opt.label}
                        data-option-index={opt.val}
                        disabled={isAnswered}
                        onClick={() => onAnswer(opt.val, isCorrect)}
                        className={`flex-1 rounded-3xl flex flex-col items-center justify-center gap-3 btn-tactile ${activeClass}`}
                    >
                        <div className={`p-3 rounded-full ${isAnswered && isCorrect ? 'bg-white/50' : 'bg-slate-50'}`}>
                           <opt.icon size={32} strokeWidth={3} />
                        </div>
                        <span className="text-lg font-black uppercase tracking-wider">{opt.label}</span>
                    </button>
                )
            })}
        </div>
    </div>
  );

  // --- RENDERER: FILL IN THE BLANK ---
  const renderFillBlank = () => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!textInput || !textInput.trim() || isAnswered) return;
        const cleanInput = textInput.trim().toLowerCase();
        const cleanAnswer = (question.correctAnswer || "").trim().toLowerCase();
        const isCorrect = cleanInput === cleanAnswer || cleanAnswer.includes(cleanInput);
        onAnswer(textInput, isCorrect);
    };

    return (
        <form onSubmit={handleSubmit} className="w-full mt-4">
            <div className="relative">
                <input 
                    type="text" 
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    disabled={isAnswered}
                    placeholder="Ketik jawaban di sini..."
                    autoFocus
                    className={`
                        w-full text-center text-2xl font-bold p-6 rounded-3xl border-b-4 outline-none transition-all shadow-sm
                        ${isAnswered 
                            ? (userAnswer?.toString().toLowerCase() === question.correctAnswer?.toLowerCase() || (question.correctAnswer?.toLowerCase().includes(userAnswer?.toString().toLowerCase()))
                                ? "bg-emerald-50 border-emerald-500 text-emerald-800" 
                                : "bg-rose-50 border-rose-500 text-rose-800")
                            : "bg-white border-slate-200 focus:border-indigo-500 text-slate-800"
                        }
                    `}
                />
                {!isAnswered && (
                    <button type="submit" className="absolute right-4 top-4 bottom-4 bg-slate-900 text-white px-5 rounded-2xl active:scale-95 transition-transform shadow-lg flex items-center justify-center">
                        <CornerDownLeft size={24} />
                    </button>
                )}
            </div>
            {isAnswered && userAnswer?.toString().toLowerCase() !== question.correctAnswer?.toLowerCase() && (
                <div className="mt-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-2xl">
                    <span className="text-xs text-emerald-600 font-bold uppercase tracking-wide block mb-1">Jawaban Sebenarnya:</span>
                    <span className="text-xl font-black text-emerald-800">{question.correctAnswer}</span>
                </div>
            )}
        </form>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-indigo-900/10 border border-white relative overflow-hidden">
         
         {/* TOP DECORATION */}
         <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />

         {/* TIME'S UP OVERLAY */}
         <AnimatePresence>
            {isAnswered && userAnswer === null && (
               <motion.div 
                  initial={{ opacity: 0, scale: 1.2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 z-20 bg-rose-500/10 backdrop-blur-[2px] flex items-center justify-center pointer-events-none"
               >
                  <motion.div 
                     initial={{ y: 20 }}
                     animate={{ y: 0 }}
                     className="bg-rose-600 text-white px-8 py-4 rounded-3xl shadow-2xl border-4 border-rose-400 flex flex-col items-center gap-2"
                  >
                     <Clock size={48} className="animate-bounce" />
                     <span className="text-3xl font-black uppercase tracking-tighter">Waktu Habis!</span>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* HEADER: BADGES */}
         <div className="flex justify-between items-center mb-8">
            <div className="flex gap-2">
                {question.type === 'TRUE_FALSE' && <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"><ToggleLeft size={12}/> T/F</span>}
                {question.type === 'FILL_BLANK' && <span className="px-3 py-1 bg-fuchsia-100 text-fuchsia-700 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"><Type size={12}/> Isian</span>}
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${question.difficulty === 'Hard' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{question.difficulty}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{question.keyPoint}</span>
         </div>

         {/* QUESTION TEXT */}
         <h2 className="text-2xl md:text-4xl font-bold text-slate-800 leading-tight mb-10">
            <RenderText text={question.text} />
         </h2>

         {/* CONTENT */}
         <div className="mb-8">
            {question.type === 'TRUE_FALSE' ? renderTrueFalse() : 
             question.type === 'FILL_BLANK' ? renderFillBlank() : 
             renderMCQ()}
         </div>

         {/* HINT BUTTON */}
         {!isAnswered && question.hint && (
            <div className="mb-8">
               <button 
                  onClick={() => setShowHint(!showHint)}
                  className="text-sm font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-2 transition-colors"
               >
                  <span className="bg-indigo-100 p-1.5 rounded-lg"><Lightbulb size={14} /></span>
                  {showHint ? "Sembunyikan Petunjuk" : "Tampilkan Petunjuk"}
               </button>
               
               <AnimatePresence>
                  {showHint && (
                     <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-3"
                     >
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-sm text-indigo-800 italic">
                           💡 {question.hint}
                        </div>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>
         )}

         {/* EXPLANATION / NEXT BUTTON */}
         <AnimatePresence>
            {isAnswered && (
               <motion.div 
                 initial={{ height: 0, opacity: 0 }} 
                 animate={{ height: 'auto', opacity: 1 }} 
                 className="overflow-hidden border-t border-slate-100 pt-8"
               >
                  <div className="bg-slate-50 rounded-2xl p-6 mb-6 border-l-4 border-indigo-500">
                     <strong className="block text-indigo-600 text-xs font-black uppercase tracking-wider mb-2">
                        Pembahasan
                     </strong>
                     <p className="text-sm md:text-base text-slate-700 leading-relaxed font-medium">
                        <RenderText text={question.explanation} />
                     </p>
                  </div>
                  
                  {onNext && (
                    <button 
                        onClick={onNext} 
                        className="btn-tactile w-full py-4 bg-slate-900 border-slate-700 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-slate-800 flex items-center justify-center gap-3"
                    >
                        Lanjut <ArrowRight size={20} />
                    </button>
                  )}
               </motion.div>
            )}
         </AnimatePresence>

      </div>
    </motion.div>
  );
};
