
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, RefreshCw, CheckCircle2, AlertCircle, ChevronRight, Zap, History, Calendar } from 'lucide-react';
import { NeuroSync } from '../services/srsService';
import { SRSItem } from '../types';
import { NeuroSyncReview } from './NeuroSyncReview';

interface NeuroSyncDashboardProps {
  keycardId: string;
  onExit: () => void;
}

export const NeuroSyncDashboard: React.FC<NeuroSyncDashboardProps> = ({ keycardId, onExit }) => {
  const [dueItems, setDueItems] = useState<SRSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [stats, setStats] = useState({ total: 0, due: 0, learned: 0 });

  const fetchItems = async () => {
    setLoading(true);
    if (!keycardId) {
      setLoading(false);
      return;
    }

    try {
      const items = await NeuroSync.getDueItems(undefined, keycardId);
      setDueItems(items);
      
      const statsData = await NeuroSync.getStats(undefined, keycardId);
      setStats(statsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [keycardId]);

  if (isReviewing) {
    return (
      <NeuroSyncReview 
        items={dueItems} 
        keycardId={keycardId} 
        onComplete={() => {
          setIsReviewing(false);
          fetchItems();
        }}
        onExit={() => {
          setIsReviewing(false);
          fetchItems();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text p-6 pb-24">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter mb-2 flex items-center gap-3">
            <Brain className="w-10 h-10 text-theme-primary" />
            NEURO-SYNC
          </h1>
          <p className="text-theme-muted font-medium">Spaced Repetition Memory System</p>
        </div>
        <button 
          onClick={onExit}
          className="px-4 py-2 rounded-full border border-theme-border text-theme-muted hover:bg-theme-glass transition-colors"
        >
          Keluar
        </button>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Stats Cards */}
        {loading ? (
          <>
            <div className="bg-theme-glass border border-theme-border p-6 rounded-3xl animate-pulse">
              <div className="h-5 bg-theme-border rounded w-1/2 mb-4"></div>
              <div className="h-12 bg-theme-border rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-theme-border rounded w-2/3"></div>
            </div>
            <div className="bg-theme-glass border border-theme-border p-6 rounded-3xl animate-pulse">
              <div className="h-5 bg-theme-border rounded w-1/2 mb-4"></div>
              <div className="h-12 bg-theme-border rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-theme-border rounded w-2/3"></div>
            </div>
            <div className="bg-theme-glass border border-theme-border p-6 rounded-3xl animate-pulse">
              <div className="h-5 bg-theme-border rounded w-1/2 mb-4"></div>
              <div className="h-12 bg-theme-border rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-theme-border rounded w-2/3"></div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-theme-glass border border-theme-border p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-4 text-theme-muted">
                <Zap className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Siap Sync</span>
              </div>
              <div className="text-5xl font-bold text-emerald-500">{dueItems.length}</div>
              <div className="text-sm text-theme-muted/70 mt-2">Item perlu di-review hari ini</div>
            </div>

            <div className="bg-theme-glass border border-theme-border p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-4 text-theme-muted">
                <History className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Total Memori</span>
              </div>
              <div className="text-5xl font-bold text-blue-500">{stats.total}</div>
              <div className="text-sm text-theme-muted/70 mt-2">Item dalam database SRS</div>
            </div>

            <div className="bg-theme-glass border border-theme-border p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-4 text-theme-muted">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Telah Dipelajari</span>
              </div>
              <div className="text-5xl font-bold text-purple-500">{stats.learned}</div>
              <div className="text-sm text-theme-muted/70 mt-2">Item dengan interval {'>'} 21 hari</div>
            </div>
          </>
        )}
      </div>

      {/* Main Action */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="bg-theme-glass border border-theme-border p-8 rounded-[2rem] text-center animate-pulse">
            <div className="h-8 bg-theme-border rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-4 bg-theme-border rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-theme-border rounded w-2/3 mx-auto mb-8"></div>
            <div className="h-14 bg-theme-border rounded-2xl w-64 mx-auto"></div>
          </div>
        ) : dueItems.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-theme-primary/10 border border-theme-primary/20 p-8 rounded-[2rem] text-center"
          >
            <h2 className="text-2xl font-bold mb-4">Otak Anda Siap untuk Sinkronisasi!</h2>
            <p className="text-theme-muted mb-8 max-w-lg mx-auto">
              Ada {dueItems.length} informasi yang mulai memudar dari ingatan Anda. 
              Lakukan review sekarang untuk memperkuat jalur saraf Anda.
            </p>
            <button 
              onClick={() => setIsReviewing(true)}
              className="px-12 py-4 bg-theme-primary hover:opacity-90 text-white font-bold rounded-2xl transition-all transform hover:scale-105 flex items-center gap-3 mx-auto"
            >
              Mulai Neuro-Sync Sekarang
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        ) : (
          <div className="text-center py-20 bg-theme-glass border border-dashed border-theme-border rounded-[2rem]">
            <CheckCircle2 className="w-16 h-16 text-theme-muted/30 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-theme-muted">Semua Jalur Saraf Sinkron!</h2>
            <p className="text-theme-muted/70 mt-2">Tidak ada item yang perlu di-review saat ini. Istirahatkan otak Anda.</p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-theme-glass border border-theme-border flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-theme-primary" />
          </div>
          <div>
            <h3 className="font-bold mb-1">Otomatis & Cerdas</h3>
            <p className="text-sm text-theme-muted">Setiap soal kuis yang salah otomatis masuk ke antrean review ini.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-theme-glass border border-theme-border flex items-center justify-center shrink-0">
            <RefreshCw className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="font-bold mb-1">Algoritma SM-2</h3>
            <p className="text-sm text-theme-muted">Jadwal review disesuaikan dengan tingkat kesulitan memori Anda.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
