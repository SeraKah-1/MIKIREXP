
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X, BrainCircuit, RotateCcw, Check, HelpCircle, Zap } from 'lucide-react';
import { Question, SRSItem } from '../types';
import { processCardReview, addQuestionToSRS } from '../services/srsService';
import { useGameSound } from '../hooks/useGameSound';

interface FlashcardScreenProps {
  questions: (Question | SRSItem)[];
  onClose: () => void;
}

// --- UTILS: Simple Formatter ---
const CardText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-theme-primary">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

export const FlashcardScreen: React.FC<FlashcardScreenProps> = ({ questions, onClose }) => {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right' | 'down' | null>(null);

  const { playClick, playCorrect, playIncorrect, triggerHaptic, playSwipe } = useGameSound();

  // --- MOTION VALUES FOR SWIPE ---
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]); // Tilt effect
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]); // Fade out logic
  
  // Background Color Overlay (Red left, Green right)
  const bgOverlayOpacity = useTransform(x, [-150, 0, 150], [0.3, 0, 0.3]);
  const bgOverlayColor = useTransform(x, [-150, 0, 150], [
    "rgba(244, 63, 94, 1)", // Red (Lupa)
    "rgba(0,0,0,0)", 
    "rgba(16, 185, 129, 1)" // Green (Paham)
  ]);

  // Stamp Opacities
  const ingatOpacity = useTransform(x, [0, 100], [0, 1]);
  const lupaOpacity = useTransform(x, [0, -100], [0, 1]);

  // Init SRS
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // If passing pure Questions, add them to SRS automatically
    questions.forEach(q => {
      if (q && !('item_type' in q)) {
        addQuestionToSRS(undefined, undefined, q);
      }
    });
    return () => { document.body.style.overflow = 'unset'; };
  }, [questions]);

  // --- LOGIC ---

  const handleNextCard = useCallback((rating: 'lupa' | 'ragu' | 'paham') => {
    // 1. Set Animation Direction & Sound
    if (rating === 'lupa') {
        if (!exitDir) setExitDir('left');
        playIncorrect();
    } else if (rating === 'paham') {
        if (!exitDir) setExitDir('right');
        playCorrect();
    } else {
        if (!exitDir) setExitDir('down'); // Ragu drops down
        playClick();
    }

    triggerHaptic();

    // 2. Process SRS
    const currentItem = questions[index];
    if (!currentItem) return;
    let quality = 2; // Good (default)
    if (rating === 'lupa') quality = 0; // Again
    if (rating === 'ragu') quality = 1; // Hard
    if (rating === 'paham') quality = 3; // Easy
    
    // Only process review if it's already an SRSItem
    if ('item_type' in currentItem) {
      processCardReview(undefined, currentItem as SRSItem, quality);
    }

    // 3. Move Next
    setTimeout(() => {
        if (index < questions.length - 1) {
            setIndex(prev => prev + 1);
            setIsFlipped(false);
            setExitDir(null);
            x.set(0); 
            y.set(0);
        } else {
            onClose(); 
        }
    }, 200);
  }, [exitDir, index, questions, onClose, playCorrect, playIncorrect, playClick, x, y, triggerHaptic]);

  const handleFlip = useCallback(() => {
    // Only flip if not dragging hard
    if (Math.abs(x.get()) < 5) {
        triggerHaptic(5);
        setIsFlipped(prev => !prev);
    }
  }, [x, triggerHaptic]);

  // Swipe Handler
  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    const velocityThreshold = 500;

    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
       handleNextCard('paham');
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
       handleNextCard('lupa');
    } else if (info.offset.y > threshold && isFlipped) {
       handleNextCard('ragu');
    }
  };

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      
      // Navigation
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp') {
         e.preventDefault();
         setIsFlipped(prev => !prev);
      }
      
      // Rating (Only allow if user wants to speed run or is checking answer)
      if (e.key === 'ArrowLeft') handleNextCard('lupa');
      if (e.key === 'ArrowRight') handleNextCard('paham');
      if (e.key === 'ArrowDown') handleNextCard('ragu');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleNextCard, onClose]);

  if (!questions || questions.length === 0) return null;
  const currentQRaw = questions[index];
  if (!currentQRaw) return null;
  const currentQ = ('item_type' in currentQRaw) ? (currentQRaw.content as Question) : (currentQRaw as Question);
  const progress = ((index + 1) / questions.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-theme-bg/95 backdrop-blur-3xl flex flex-col items-center justify-center font-sans text-theme-text overflow-hidden touch-none">
      
      {/* Dynamic Background Flash */}
      <motion.div style={{ backgroundColor: bgOverlayColor, opacity: bgOverlayOpacity }} className="absolute inset-0 pointer-events-none z-0 transition-colors" />

      {/* --- HEADER --- */}
      <div className="absolute top-0 left-0 w-full z-20 p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center w-full max-w-lg mx-auto">
           <button onClick={onClose} className="p-2 rounded-full hover:bg-theme-text/10 text-theme-muted transition-colors">
              <X size={24} />
           </button>
           <span className="text-sm font-bold uppercase tracking-widest text-theme-text opacity-80">Flashcard</span>
           <div className="text-xs font-mono opacity-50">{index + 1}/{questions.length}</div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full max-w-lg mx-auto h-1.5 bg-slate-200/20 rounded-full overflow-hidden">
           <motion.div 
             className="h-full bg-theme-primary"
             initial={{ width: 0 }}
             animate={{ width: `${progress}%` }}
             transition={{ duration: 0.3 }}
           />
        </div>
      </div>

      {/* --- CARD CONTAINER --- */}
      <div className="relative w-full max-w-sm aspect-[3/4] md:h-[60vh] md:w-auto md:aspect-[3/4] z-10 flex items-center justify-center perspective-1000">
         
         {/* Background Stack Decoration */}
         {index < questions.length - 1 && (
             <div className="absolute inset-0 scale-[0.95] translate-y-4 bg-theme-glass border border-theme-border rounded-[2rem] -z-10 opacity-50 blur-[1px]" />
         )}

         {/* ACTIVE CARD */}
         <motion.div
           key={index}
           style={{ x, y, rotate, opacity }}
           drag // Enable Swipe in all directions
           dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
           dragElastic={0.8}
           onDragStart={playSwipe}
           onDragEnd={handleDragEnd}
           animate={
              exitDir === 'left' ? { x: -500, opacity: 0, rotate: -30 } :
              exitDir === 'right' ? { x: 500, opacity: 0, rotate: 30 } :
              exitDir === 'down' ? { y: 500, opacity: 0 } :
              { x: 0, y: 0, rotate: 0, opacity: 1 }
           }
           transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 20 }}
           className="w-full h-full relative cursor-grab active:cursor-grabbing preserve-3d"
         >
            {/* STAMPS (Visible when dragging) */}
            <motion.div 
              className="absolute top-8 left-8 z-50 border-4 border-emerald-500 text-emerald-500 font-black text-4xl px-4 py-2 rounded-xl uppercase tracking-widest transform -rotate-12 pointer-events-none"
              style={{ opacity: ingatOpacity }}
            >
              INGAT
            </motion.div>
            <motion.div 
              className="absolute top-8 right-8 z-50 border-4 border-rose-500 text-rose-500 font-black text-4xl px-4 py-2 rounded-xl uppercase tracking-widest transform rotate-12 pointer-events-none"
              style={{ opacity: lupaOpacity }}
            >
              LUPA
            </motion.div>

            {/* 
                FLIP ANIMATION CONTAINER 
                This div handles the 180deg rotation.
                It must have `transformStyle: 'preserve-3d'`
            */}
            <motion.div
                className="w-full h-full relative"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
                style={{ transformStyle: 'preserve-3d' }}
                onClick={handleFlip}
            >
                {/* --- FRONT FACE (QUESTION) --- 
                    Visible at 0deg. Hidden at 180deg.
                */}
                <div 
                    className="absolute inset-0 bg-theme-glass backdrop-blur-xl border border-theme-border rounded-[2rem] shadow-2xl flex flex-col items-center justify-center p-8 text-center backface-hidden"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                    <div className="mb-6 p-4 bg-theme-primary/10 text-theme-primary rounded-2xl">
                        <BrainCircuit size={40} />
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center w-full overflow-y-auto custom-scrollbar">
                        <h3 className="text-xl md:text-2xl font-bold leading-relaxed text-theme-text select-none">
                            <CardText text={currentQ.text} />
                        </h3>
                    </div>

                    <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-theme-muted font-bold animate-pulse">
                        Tap untuk Balik
                    </p>
                </div>

                {/* --- BACK FACE (ANSWER) --- 
                    Visible at 180deg. Hidden at 0deg.
                    Fix: We rotate this 180deg initially so it's "upside down" relative to the front.
                    When the parent rotates 180deg, this becomes right-side up.
                */}
                <div 
                    className="absolute inset-0 bg-theme-bg text-theme-text border border-theme-border rounded-[2rem] shadow-2xl flex flex-col p-8 overflow-hidden backface-hidden"
                    style={{ 
                        transform: 'rotateY(180deg)', 
                        backfaceVisibility: 'hidden', 
                        WebkitBackfaceVisibility: 'hidden' 
                    }}
                >
                    <div className="flex items-center gap-2 mb-4 opacity-70 border-b border-theme-border pb-4">
                        <Zap size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-theme-muted">Jawaban</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col justify-center select-none">
                        <h3 className="text-xl font-bold text-emerald-600 mb-4 leading-snug">
                            {currentQ.options[currentQ.correctIndex]}
                        </h3>
                        <div className="text-sm leading-relaxed text-theme-text/80">
                            <CardText text={currentQ.explanation} />
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-theme-border flex justify-center text-theme-muted text-[10px] uppercase tracking-widest opacity-60">
                       Swipe Kiri (Lupa) &bull; Bawah (Ragu) &bull; Kanan (Paham)
                    </div>
                </div>
            </motion.div>
         </motion.div>
      </div>

      {/* --- BOTTOM ACTIONS (3 Options: Lupa, Ragu, Paham) --- */}
      <div className="absolute bottom-10 left-0 w-full px-6 flex justify-center items-end gap-6 z-50 h-24 pointer-events-none">
          <AnimatePresence>
            {isFlipped && (
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    className="flex gap-4 pointer-events-auto"
                >
                    <button 
                        onClick={() => handleNextCard('lupa')}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 border-2 border-rose-100 flex items-center justify-center text-rose-500 shadow-sm group-hover:scale-110 group-active:scale-95 transition-all">
                            <HelpCircle size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-rose-500 uppercase">Lupa</span>
                    </button>

                    <button 
                        onClick={() => handleNextCard('ragu')}
                        className="flex flex-col items-center gap-1 group -mt-2"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-100 flex items-center justify-center text-amber-500 shadow-sm group-hover:scale-110 group-active:scale-95 transition-all">
                            <BrainCircuit size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-amber-500 uppercase">Ragu</span>
                    </button>

                    <button 
                        onClick={() => handleNextCard('paham')}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-110 group-active:scale-95 transition-all">
                            <Check size={24} strokeWidth={3} />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-500 uppercase">Paham</span>
                    </button>
                </motion.div>
            )}
          </AnimatePresence>
      </div>

    </div>
  );
};
