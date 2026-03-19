
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Heart, Zap, Music, Cloud, Coffee } from 'lucide-react';

interface LoadingScreenProps {
  status?: string;
}

// Koleksi Silly & Expressive Chibi States
const CHIBI_STATES = [
  {
    face: "( ◕ ‿ ◕ )",
    color: "from-blue-200 to-indigo-200",
    shadow: "shadow-indigo-500/30",
    message: "Permisi, numpang baca PDF...",
    scale: 1
  },
  {
    face: "( ╯°□°)╯ ┻━┻", // Table Flip
    color: "from-red-200 to-orange-200",
    shadow: "shadow-orange-500/30",
    message: "Materinya susah bangeet!!",
    scale: 1.1
  },
  {
    face: "┬─┬ ノ( ゜-゜ノ)", // Put table back
    color: "from-emerald-200 to-teal-200",
    shadow: "shadow-emerald-500/30",
    message: "Eh maaf, kalem kalem...",
    scale: 1
  },
  {
    face: "( 〜 ￣ ▽ ￣ )〜", // Dancing
    color: "from-purple-200 to-pink-200",
    shadow: "shadow-pink-500/30",
    message: "Vibing sama data kamu~",
    scale: 1.05
  },
  {
    face: "( ; ; ; * _ * )", // Panic / Sweating
    color: "from-slate-200 to-gray-300",
    shadow: "shadow-slate-500/30",
    message: "Buset, banyak banget halamannya...",
    scale: 0.95
  },
  {
    face: "( ✧ ω ✧ )", // Star Eyes
    color: "from-amber-200 to-yellow-200",
    shadow: "shadow-amber-500/30",
    message: "Nemu fakta menarik nih!",
    scale: 1.1
  },
  {
    face: "( ˘ ɜ ˘ )", // Whistling/Chill
    color: "from-sky-200 to-cyan-200",
    shadow: "shadow-sky-500/30",
    message: "Santai dulu gak sih...",
    scale: 1
  },
  {
    face: "ʕ • ᴥ • ʔ", // Bear
    color: "from-orange-100 to-amber-100",
    shadow: "shadow-orange-400/30",
    message: "Mode beruang pintar aktif.",
    scale: 1.05
  },
  {
    face: "( ¬ ‿ ¬ )", // Smug
    color: "from-lime-200 to-green-200",
    shadow: "shadow-lime-500/30",
    message: "Gampang ini mah (sombong dikit).",
    scale: 1
  },
  {
    face: "( x _ x )", // Dizzy
    color: "from-rose-200 to-pink-200",
    shadow: "shadow-rose-500/30",
    message: "Overheat... butuh kipas angin.",
    scale: 0.9
  }
];

const FLOATING_ICONS = [
  { Icon: Star, color: "text-yellow-400", delay: 0 },
  { Icon: Heart, color: "text-rose-400", delay: 1 },
  { Icon: Zap, color: "text-amber-400", delay: 2 },
  { Icon: Sparkles, color: "text-indigo-400", delay: 0.5 },
  { Icon: Music, color: "text-pink-400", delay: 1.5 },
  { Icon: Cloud, color: "text-sky-400", delay: 2.5 },
  { Icon: Coffee, color: "text-emerald-400", delay: 3.0 },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ status = "Memproses..." }) => {
  const [stateIndex, setStateIndex] = useState(0);

  // Cycle through chibi states faster (every 2 seconds) for more dynamic feel
  useEffect(() => {
    const interval = setInterval(() => {
      setStateIndex((prev) => (prev + 1) % CHIBI_STATES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentState = CHIBI_STATES[stateIndex];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[60vh] w-full overflow-hidden">
      
      {/* Background Particles */}
      {FLOATING_ICONS.map((item, i) => (
        <motion.div
          key={i}
          className={`absolute ${item.color} opacity-30`}
          initial={{ y: 100, x: Math.random() * 200 - 100, opacity: 0 }}
          animate={{ 
            y: [-50, -150], 
            x: Math.random() * 100 - 50,
            opacity: [0, 0.6, 0],
            rotate: [0, 45, -45, 0]
          }}
          transition={{ 
            duration: 5 + Math.random() * 3, 
            repeat: Infinity, 
            delay: item.delay,
            ease: "easeInOut"
          }}
          style={{ 
            left: `${10 + Math.random() * 80}%`, 
            top: `${40 + Math.random() * 40}%` 
          }}
        >
          <item.Icon size={24 + Math.random() * 24} />
        </motion.div>
      ))}

      {/* Main Glass Card */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 bg-white/40 backdrop-blur-2xl border border-white/60 p-12 rounded-[3rem] shadow-2xl shadow-indigo-500/10 flex flex-col items-center max-w-md text-center w-full"
      >
        
        {/* CHIBI CHARACTER CONTAINER */}
        <div className="relative h-48 w-48 mb-6 flex items-center justify-center">
          
          {/* The Blob Body */}
          <motion.div
            layout
            key={stateIndex} // Re-render animation on state change
            className={`
              absolute inset-0 rounded-[35%] bg-gradient-to-tr ${currentState.color}
              ${currentState.shadow} shadow-2xl backdrop-blur-sm
            `}
            animate={{ 
              y: [0, -20, 0], // Higher Bounce
              scale: [1, 1.1, 0.9, 1], // More drastic Squish
              rotate: [0, -5, 5, 0] // Wiggle
            }}
            transition={{ 
              duration: 2, 
              ease: "easeInOut",
              times: [0, 0.5, 0.75, 1]
            }}
          >
             {/* Glossy Reflection (Highlight) */}
             <div className="absolute top-6 left-6 w-10 h-6 bg-white/40 rounded-full blur-md transform -rotate-12" />
             <div className="absolute top-8 left-4 w-3 h-3 bg-white/70 rounded-full blur-[1px]" />
          </motion.div>

          {/* The Face (Kaomoji) */}
          <motion.div
            key={`face-${stateIndex}`}
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: currentState.scale, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="relative z-10 text-slate-800 font-black text-4xl tracking-widest whitespace-nowrap drop-shadow-sm"
          >
            {currentState.face}
          </motion.div>
        </div>

        {/* Technical Status */}
        <motion.h2 
          key={status}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-bold text-slate-700 mb-2 uppercase tracking-wide"
        >
          {status}
        </motion.h2>

        {/* Progress Bar */}
        <div className="w-full h-4 bg-slate-200/50 rounded-full overflow-hidden mb-6 relative border border-white/50 shadow-inner">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-400 via-pink-400 to-purple-400"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 15, ease: "linear", repeat: Infinity }} 
          />
          {/* Shimmer Effect on Bar */}
          <motion.div 
            className="absolute top-0 left-0 h-full w-20 bg-white/60 skew-x-12 blur-md"
            animate={{ x: [-100, 400] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Dialogue Box (Fun Message) */}
        <div className="h-12 relative w-full overflow-hidden flex justify-center items-center">
          <AnimatePresence mode='wait'>
            <motion.div
              key={stateIndex}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              className="absolute w-full"
            >
              <p className="text-sm font-semibold text-indigo-600 bg-indigo-50/80 px-6 py-2 rounded-2xl border border-indigo-100 shadow-sm mx-auto inline-block">
                "{currentState.message}"
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

      </motion.div>

      <p className="mt-8 text-[10px] text-slate-500/70 font-bold tracking-[0.3em] uppercase animate-pulse">
        Generating Questions...
      </p>
    </div>
  );
};
