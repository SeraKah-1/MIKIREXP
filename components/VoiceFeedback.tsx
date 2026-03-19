
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Activity } from 'lucide-react';

interface VoiceFeedbackProps {
  isListening: boolean;
  lastTranscript: string;
  feedbackMsg: string;
  error: string | null;
}

export const VoiceFeedback: React.FC<VoiceFeedbackProps> = ({ isListening, lastTranscript, feedbackMsg, error }) => {
  if (!isListening && !error) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40"
      >
        <div className={`
          backdrop-blur-xl border shadow-xl rounded-full px-6 py-3 flex items-center gap-4 min-w-[200px] max-w-[90vw]
          ${error ? 'bg-rose-500/90 border-rose-400 text-white' : 'bg-slate-900/80 border-slate-700 text-white'}
        `}>
          {/* Status Icon */}
          <div className="shrink-0 relative">
             {error ? (
                <MicOff size={20} className="text-white/80" />
             ) : (
                <>
                  <Mic size={20} className="text-emerald-400 relative z-10" />
                  <span className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-50" />
                </>
             )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 flex flex-col items-start justify-center">
             {error ? (
                <span className="text-xs font-bold">{error}</span>
             ) : (
                <>
                   {feedbackMsg ? (
                      <motion.span 
                        key={feedbackMsg}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-bold text-emerald-300"
                      >
                        {feedbackMsg}
                      </motion.span>
                   ) : (
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">
                           {lastTranscript ? `"${lastTranscript}"` : "Mendengarkan..."}
                        </span>
                        {!lastTranscript && (
                           <span className="text-[10px] text-slate-500 italic">Katakan "A", "Satu", atau "Lanjut"</span>
                        )}
                      </div>
                   )}
                </>
             )}
          </div>

          {/* Visualizer Animation */}
          {!error && !feedbackMsg && (
             <div className="flex gap-0.5 h-4 items-center shrink-0">
               {[1,2,3,4].map(i => (
                 <motion.div 
                   key={i}
                   className="w-1 bg-emerald-500 rounded-full"
                   animate={{ height: [4, 12, 4] }}
                   transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                 />
               ))}
             </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
