import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, ArrowLeft, Crown, Medal, User } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Player {
  id: string;
  name: string;
  score: number;
  is_online: boolean;
}

interface MultiplayerLeaderboardProps {
  roomId: string;
  currentPlayerId: string;
  onExit: () => void;
}

export const MultiplayerLeaderboard: React.FC<MultiplayerLeaderboardProps> = ({ roomId, currentPlayerId, onExit }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data: Player[] = []; // Placeholder
        setPlayers(data);
        
        // Trigger confetti if current player is in top 3
        const myRank = data.findIndex((p: Player) => p.id === currentPlayerId);
        if (myRank >= 0 && myRank < 3 && loading) {
            triggerConfetti();
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLoading(false);
      }
    };

    const triggerConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults, particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults, particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    };

    fetchLeaderboard();

    return () => {
    };
  }, [roomId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col items-center p-6">
      <div className="w-full max-w-2xl flex items-center justify-between mb-8">
        <button onClick={onExit} className="p-3 bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-rose-500 rounded-2xl hover:bg-rose-50 transition-all active:scale-95">
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
          <Trophy size={20} className="text-amber-500" />
          <span className="font-bold text-slate-700">Leaderboard</span>
        </div>
        <div className="w-12"></div> {/* Spacer for alignment */}
      </div>

      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-indigo-900 flex items-center gap-2">
            <Users size={24} className="text-indigo-500" />
            Hasil Akhir
          </h2>
          <div className="text-sm font-bold text-indigo-500 bg-white px-3 py-1 rounded-full shadow-sm border border-indigo-100">
            {players.length} Pemain
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {players.map((player, index) => {
            const isMe = player.id === currentPlayerId;
            let RankIcon = User;
            let rankColor = "text-slate-400";
            let rankBg = "bg-slate-100";
            
            if (index === 0) {
              RankIcon = Crown;
              rankColor = "text-amber-500";
              rankBg = "bg-amber-100";
            } else if (index === 1) {
              RankIcon = Medal;
              rankColor = "text-slate-400";
              rankBg = "bg-slate-100";
            } else if (index === 2) {
              RankIcon = Medal;
              rankColor = "text-amber-700";
              rankBg = "bg-amber-50";
            }

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-4 rounded-2xl border ${isMe ? 'border-indigo-300 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-white'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${rankBg} ${rankColor}`}>
                    {index < 3 ? <RankIcon size={20} /> : index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-slate-700 flex items-center gap-2">
                      {player.name}
                      {isMe && <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Kamu</span>}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${player.is_online ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      {player.is_online ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-black text-indigo-600">
                  {player.score} <span className="text-sm text-indigo-300 font-bold">pts</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
