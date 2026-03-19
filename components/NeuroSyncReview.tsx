
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Brain, CheckCircle2, XCircle, HelpCircle, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { SRSItem, Question } from '../types';
import { NeuroSync } from '../services/srsService';

interface NeuroSyncReviewProps {
  items: SRSItem[];
  keycardId: string;
  onComplete: () => void;
  onExit: () => void;
}

export const NeuroSyncReview: React.FC<NeuroSyncReviewProps> = ({ items, keycardId, onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ id: string; rating: number }[]>([]);

  const currentItem = items[currentIndex];
  const progress = ((currentIndex) / items.length) * 100;

  const handleRate = async (rating: number) => {
    if (isProcessing) return;
    setIsProcessing(true);

    await NeuroSync.processReview(undefined, currentItem, rating);

    setSessionResults([...sessionResults, { id: currentItem.id!, rating }]);

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setIsProcessing(false);
    } else {
      onComplete();
    }
  };

  const renderContent = () => {
    if (!currentItem) return null;
    if (currentItem.item_type === 'quiz_question') {
      const q = currentItem.content as Question;
      return (
        <div className="space-y-8">
          <div className="text-center">
            <span className="px-3 py-1 rounded-full bg-theme-primary/10 text-theme-primary text-xs font-bold uppercase tracking-widest border border-theme-primary/20 mb-4 inline-block">
              Pertanyaan Kuis
            </span>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight mt-4">{q.text}</h2>
          </div>

          <AnimatePresence mode="wait">
            {!showAnswer ? (
              <motion.div 
                key="question"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <button 
                  onClick={() => setShowAnswer(true)}
                  className="group flex flex-col items-center gap-4 text-theme-muted hover:text-theme-primary transition-colors"
                >
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-theme-border group-hover:border-theme-primary/50 flex items-center justify-center transition-all">
                    <HelpCircle className="w-10 h-10" />
                  </div>
                  <span className="font-bold tracking-wider uppercase text-sm">Ketuk untuk Lihat Jawaban</span>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="answer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="p-6 bg-theme-primary/10 border border-theme-primary/20 rounded-3xl">
                  <div className="flex items-center gap-3 text-theme-primary mb-2 font-bold uppercase text-xs tracking-widest">
                    <CheckCircle2 className="w-4 h-4" />
                    Jawaban Benar
                  </div>
                  <p className="text-2xl md:text-4xl font-bold">{q.options[q.correctIndex] || q.correctAnswer}</p>
                </div>

                {q.explanation && (
                  <div className="p-6 bg-theme-glass border border-theme-border rounded-3xl">
                    <p className="text-theme-muted text-sm leading-relaxed italic">"{q.explanation}"</p>
                  </div>
                )}

                <div className="pt-8">
                  <p className="text-center text-theme-muted text-sm font-bold uppercase tracking-widest mb-6">Seberapa baik Anda mengingat ini?</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button 
                      onClick={() => handleRate(0)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-theme-glass border border-theme-border hover:border-red-500/50 hover:bg-red-500/5 transition-all"
                    >
                      <XCircle className="w-6 h-6 text-red-500" />
                      <span className="font-bold text-sm">Lupa</span>
                      <span className="text-[10px] text-theme-muted uppercase">Again</span>
                    </button>
                    <button 
                      onClick={() => handleRate(1)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-theme-glass border border-theme-border hover:border-orange-500/50 hover:bg-orange-500/5 transition-all"
                    >
                      <Zap className="w-6 h-6 text-orange-500" />
                      <span className="font-bold text-sm">Sulit</span>
                      <span className="text-[10px] text-theme-muted uppercase">Hard</span>
                    </button>
                    <button 
                      onClick={() => handleRate(2)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-theme-glass border border-theme-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
                    >
                      <RefreshCw className="w-6 h-6 text-blue-500" />
                      <span className="font-bold text-sm">Bagus</span>
                      <span className="text-[10px] text-theme-muted uppercase">Good</span>
                    </button>
                    <button 
                      onClick={() => handleRate(3)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-theme-glass border border-theme-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <span className="font-bold text-sm">Mudah</span>
                      <span className="text-[10px] text-theme-muted uppercase">Easy</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-theme-border">
        <button onClick={onExit} className="p-2 hover:bg-theme-glass rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-theme-primary" />
          <span className="font-bold tracking-tighter">NEURO-SYNC SESSION</span>
        </div>
        <div className="text-theme-muted font-mono text-sm">
          {currentIndex + 1} / {items.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-theme-glass w-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-theme-primary"
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {renderContent()}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-8 text-center text-theme-muted/50 text-[10px] uppercase tracking-[0.2em] font-bold">
        Powered by Neuro-Sync Algorithm SM-2
      </div>
    </div>
  );
};
