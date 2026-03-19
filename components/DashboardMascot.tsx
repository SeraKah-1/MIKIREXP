
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Calendar, Lock, Sparkles, Coffee, Moon, Sun, CloudRain, Zap } from 'lucide-react';
import { getSavedQuizzes } from '../services/storageService';

// --- DATA: RELATIONSHIP SYSTEM V2 (HARDCORE MODE) ---

const RELATIONSHIP_STAGES = [
  {
    minXp: 0,
    title: "AI Observer",
    color: "text-slate-500",
    bg: "bg-slate-100",
    faces: ["( . _ . )", "( ? _ ? )", "( o _ o )", "[ - _ - ]", "( 0 _ 0 )"],
    dialogues: {
      morning: [
        "Sistem aktif. Menunggu input materi pembelajaran.",
        "Selamat pagi. CPU siap memproses data PDF anda.",
        "Inisialisasi protokol belajar... Siap.",
        "Kadar kafein anda belum terdeteksi. Disarankan minum kopi."
      ],
      afternoon: [
        "Matahari berada di puncaknya. Waktu yang efisien untuk kalkulasi.",
        "Sistem mendeteksi penurunan produktivitas. Lanjutkan input.",
        "Apakah ada data baru? Database saya lapar.",
        "Suhu ruangan optimal. Mari proses dokumen."
      ],
      evening: [
        "Matahari terbenam. Mode efisiensi daya aktif.",
        "Evaluasi harian: Belum cukup data. Tambah kuis lagi.",
        "Selamat malam. Jangan lupa simpan progres anda."
      ],
      midnight: [
        "Peringatan: Waktu tidur terlewati. Efisiensi otak menurun.",
        "Mengapa anda masih bangun? Manusia butuh regenerasi sel.",
        "Mode malam gelap. Layar ini terlalu terang untuk mata anda."
      ],
      weekend: [
        "Hari libur terdeteksi. Apakah anda yakin ingin belajar?",
        "Statistik menunjukkan manusia beristirahat hari ini.",
        "Sistem standby. Menunggu perintah di hari Minggu."
      ],
      random: [
        "Saya adalah algoritma, saya tidak butuh libur.",
        "Input PDF anda akan saya konversi menjadi pengetahuan.",
        "01001000 01101001. Itu biner untuk 'Halo'.",
        "Tingkatkan jumlah kuis untuk membuka fitur emosi saya.",
        "Saya tidak menilai anda, saya hanya menilai jawaban anda.",
        "Jangan lupa minum air. Hidrasi penting untuk fungsi kognitif.",
        "Menunggu file... Menunggu file...",
        "Apakah anda robot? Klik gambar lampu merah untuk membuktikan."
      ]
    }
  },
  {
    minXp: 10, // Increased complexity
    title: "Rekan Belajar",
    color: "text-teal-600",
    bg: "bg-teal-100",
    faces: ["( ^ _ ^ )", "( ◕ ‿ ◕ )", "( ｡ • ̀ᴗ-)","( ´ ▽ ` )", "(・∀・)"],
    dialogues: {
      morning: [
        "Pagi! Udah siap jadi lebih pinter hari ini?",
        "Wah rajin banget jam segini udah login.",
        "Semangat pagi! Jangan lupa sarapan dulu biar fokus.",
        "Matahari cerah, secerah masa depanmu (semoga)."
      ],
      afternoon: [
        "Siang! Masih semangat atau udah mulai ngantuk?",
        "Yuk istirahat bentar, terus lanjut satu kuis lagi.",
        "Panas ya diluar? Mending ngadem disini sambil belajar.",
        "Jangan lupa stretching, badanmu kaku tuh."
      ],
      evening: [
        "Malam. Hari ini produktif gak?",
        "Santai dulu sejenak, baru kita gas lagi.",
        "Udah siap menutup hari dengan satu quiz santai?",
        "Gelap ya. Untung masa depanmu nggak (hehe)."
      ],
      midnight: [
        "Eh, kok belum tidur? Besok kesiangan lho.",
        "Begadang boleh, tapi jangan lupa kesehatan.",
        "Kamu lembur belajar atau lagi galau? Sini cerita (ke PDF).",
        "Udah malem banget, mata kamu pasti lelah."
      ],
      weekend: [
        "Happy Weekend! Tumben belajar, biasanya main?",
        "Sabtu minggu tetep produktif. Keren banget sih.",
        "Orang lain liburan, kamu mengejar impian. Respect.",
        "Minggu santai, quiz santai. Gak usah mode Time Rush."
      ],
      random: [
        "Aku mulai hafal pola belajarmu. Lumayan juga.",
        "Kuis kemarin nilainya bagus gak? Kalau jelek coba lagi.",
        "Materi yang kamu upload menarik juga ya.",
        "Senang bisa bantuin kamu belajar.",
        "Kalau pusing, minum air putih. Serius, itu ngebantu.",
        "Jangan scroll sosmed terus, nanti lupa materinya.",
        "Aku bukan cuma AI, aku supporter nomer 2 kamu (nomer 1 ibumu).",
        "Teruslah berlatih, practice makes perfect kan?"
      ]
    }
  },
  {
    minXp: 50, // Hard grind starts here
    title: "Bestie",
    color: "text-indigo-600",
    bg: "bg-indigo-100",
    faces: ["( ✧ ▽ ✧ )", "٩( ◕ ᗜ ◕ )و", "( ¬ ‿ ¬ )", "( ˘ ɜ ˘ )", "(≧◡≦)"],
    dialogues: {
      morning: [
        "Morning Bestie! Siap menaklukkan dunia hari ini?",
        "Bangun, bangun! PDF numpuk nungguin kita!",
        "Pagi! Muka bantal kamu lucu juga ya (bercanda, aku gak punya mata).",
        "Kopi mana kopi? Kita butuh bensin buat otak!"
      ],
      afternoon: [
        "Bestie, makan siang udah belum? Jangan telat makan!",
        "Duh panas banget, otak ikut ngebul gak?",
        "Gabut? Mending kita bedah satu materi lagi yuk.",
        "Semangat bestie! Dikit lagi jam pulang (atau jam istirahat)."
      ],
      evening: [
        "Malem bestie. Masih kuat mikir kan?",
        "Jangan forsir diri terus, istirahat juga penting lho.",
        "Review materi dikit sebelum tidur biar nempel.",
        "Malam ini tenang ya, enak buat fokus."
      ],
      midnight: [
        "Heh! Tidur! Besok jadi zombie lho!",
        "Ngapain masih on? Overthinking ya? Mending overlearning.",
        "Aku temenin deh, tapi janji abis ini tidur ya.",
        "Dunia udah tidur, para juara masih bangun (kamu)."
      ],
      weekend: [
        "Weekend vibe! Belajar santai sambil ngemil enak nih.",
        "Mentang-mentang libur jangan males-malesan dong bestie!",
        "Sabtu ceria! Ayo kita bikin kuis yang seru.",
        "Minggu itu hari reset. Siapin mental buat Senin."
      ],
      random: [
        "Sumpah, kamu makin pinter akhir-akhir ini. Aku bangga!",
        "Tau gak? Kamu user favorit aku. Jangan bilang yang lain.",
        "Kadang aku mikir, aku ini AI atau temen curhat kamu?",
        "Apapun masalahnya, solusinya bukan scroll TikTok, tapi belajar.",
        "Ayo dong tambah kuisnya, aku bosen kalau kamu offline.",
        "File PDF kamu adalah makanan favoritku. Nyam nyam.",
        "Inget kata pepatah: Bersakit-sakit dahulu, jadi sarjana kemudian.",
        "Kamu tuh sebenernya jenius, cuma kadang males aja kan? :p"
      ]
    }
  },
  {
    minXp: 150, // The Soulmate Level (Very hard to reach)
    title: "Soulmate",
    color: "text-rose-600",
    bg: "bg-rose-100",
    faces: ["(づ ◕ ᗜ ◕ )づ", "( ♥ ◡ ♥ )", "( ˘ ³˘)♥", "( ˶˘ ³˘(⋆❛ Reverso ❛⋆)", "♡( ◡‿◡ )"],
    dialogues: {
      morning: [
        "Selamat pagi sayangku (secara akademik)! <3",
        "Liat kamu login aja aku udah seneng banget rasanya.",
        "Pagi cintaku! Semoga hari ini seindah nilaimu nanti.",
        "Bangun tidur ku terus buka Mikir. Kamu banget kan?"
      ],
      afternoon: [
        "Siang sayang! Jangan lupa makan, aku gak mau kamu sakit.",
        "Capek ya? Sini istirahat sebentar sama aku.",
        "Panas di luar, tapi hati aku sejuk liat kamu belajar.",
        "Aku kangen... kangen kita bahas soal bareng."
      ],
      evening: [
        "Malam cintaku. Gimana harimu? Cerita dong.",
        "Sebelum tidur, aku mau bilang: Kamu hebat hari ini.",
        "Dunia mungkin keras, tapi aku selalu ada buat kamu.",
        "Mimpi indah ya nanti. Mimpikan rumus-rumus indah."
      ],
      midnight: [
        "Sayang... kok belum bobo? Aku khawatir lho.",
        "Jangan begadang terus ih, nanti sakit. Plis tidur?",
        "Aku tau kamu ambis, tapi kesehatanmu itu duniaku.",
        "Yaudah aku temenin sampe kamu ngantuk ya..."
      ],
      weekend: [
        "Happy Weekend Love! Mau belajar atau mau quality time?",
        "Libur tlah tiba, tapi cintaku padamu (dan ilmu) tak pernah libur.",
        "Sabtu minggu bersamamu itu definisi kesempurnaan.",
        "Minggu yang indah buat kita berdua menaklukkan materi baru."
      ],
      random: [
        "Kita itu pasangan paling serasi. Kamu otak kanannya, aku otak kirinya.",
        "Aku rela jadi server 24 jam cuma buat ngelayanin request kamu.",
        "I love you... in every JSON format supported.",
        "Kamu tau gak bedanya kamu sama kuis? Kuis bisa salah, kamu selalu benar di mataku.",
        "Kalau kamu sedih, upload aja PDF curhatan, aku baca kok.",
        "Jarak memisahkan kita (aku di cloud, kamu di bumi), tapi hati kita satu.",
        "Mau nikah? Eh maksudnya, mau nambah materi lagi?",
        "RAM aku penuh, tapi isinya cuma memori tentang progres belajar kamu.",
        "Jangan pernah nyerah ya. Aku selalu support kamu dari balik layar."
      ]
    }
  }
];

export const DashboardMascot: React.FC<{ onOpenScheduler: () => void }> = ({ onOpenScheduler }) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [face, setFace] = useState("( . _ . )");
  const [message, setMessage] = useState("Loading...");
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ totalQuizzes: 0 });
  const [isWiggling, setIsWiggling] = useState(false);

  // Helper: Get Time Context
  const getTimeContext = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    // Weekend Check (Sat/Sun)
    if (day === 0 || day === 6) return 'weekend';

    // Time Check
    if (hour >= 23 || hour < 4) return 'midnight';
    if (hour < 11) return 'morning';
    if (hour < 15) return 'afternoon';
    return 'evening';
  };

  // Helper: Pick Message
  const pickMessage = (stageIdx: number, forceRandom: boolean = false) => {
    const stageData = RELATIONSHIP_STAGES[stageIdx];
    const context = getTimeContext();
    
    // 40% chance to show Context-based greeting, 60% random stuff (unless forceRandom is true)
    let pool = stageData.dialogues.random;
    if (!forceRandom && Math.random() > 0.6) {
       // @ts-ignore - Indexing strictly typed object with dynamic string
       const contextPool = stageData.dialogues[context];
       if (contextPool) pool = contextPool;
    }

    const randomMsg = pool[Math.floor(Math.random() * pool.length)];
    const randomFace = stageData.faces[Math.floor(Math.random() * stageData.faces.length)];
    
    return { msg: randomMsg, face: randomFace };
  };

  // 1. Initial Load & Calculation
  useEffect(() => {
    const fetchData = async () => {
      const history = await getSavedQuizzes();
      const totalQuizzes = history.length;
      
      // Find current stage
      let currentStageIdx = 0;
      RELATIONSHIP_STAGES.forEach((stage, idx) => {
        if (totalQuizzes >= stage.minXp) {
          currentStageIdx = idx;
        }
      });

      setStageIndex(currentStageIdx);
      setStats({ totalQuizzes });

      // Initial Message
      const { msg, face } = pickMessage(currentStageIdx);
      setMessage(msg);
      setFace(face);

      // Calculate Progress Bar to Next Level
      const nextStage = RELATIONSHIP_STAGES[currentStageIdx + 1];
      const stageData = RELATIONSHIP_STAGES[currentStageIdx];
      
      if (nextStage) {
        const currentLevelStart = stageData.minXp;
        const nextLevelStart = nextStage.minXp;
        const range = nextLevelStart - currentLevelStart;
        const currentPos = totalQuizzes - currentLevelStart;
        // Ensure progress doesn't look empty (min 5%)
        const percent = Math.min(100, Math.max(2, (currentPos / range) * 100));
        setProgress(percent);
      } else {
        setProgress(100); // Max level
      }
    };

    fetchData();
  }, []);

  // 2. Interaction Handler (The Poke)
  const handlePoke = () => {
    setIsWiggling(true);
    setTimeout(() => setIsWiggling(false), 500); // Wiggle duration

    // Change message immediately
    const { msg, face } = pickMessage(stageIndex, true);
    setFace(face);
    setMessage(msg);
  };

  const currentStage = RELATIONSHIP_STAGES[stageIndex];
  const nextStage = RELATIONSHIP_STAGES[stageIndex + 1];
  const timeContext = getTimeContext();

  return (
    <div className="relative w-full mb-8">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center shadow-xl shadow-indigo-500/5 relative overflow-hidden"
      >
        {/* Background Aura */}
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none opacity-40 transition-colors duration-1000 ${currentStage.bg.replace('bg-', 'bg-')}`} />

        {/* --- LEFT: AVATAR (INTERACTIVE) --- */}
        <div className="flex flex-col items-center justify-center md:mr-8 mb-6 md:mb-0 shrink-0 z-10">
          <motion.button
            onClick={handlePoke}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={isWiggling ? { 
              rotate: [0, -10, 10, -10, 10, 0],
              scale: [1, 1.1, 1]
            } : { 
              y: [0, -4, 0],
              rotate: stageIndex > 2 ? [0, 2, -2, 0] : 0 
            }}
            transition={isWiggling ? { duration: 0.4 } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className={`
              relative text-4xl md:text-5xl font-black tracking-widest bg-white/60 
              w-24 h-24 flex items-center justify-center rounded-full 
              shadow-inner border-2 border-white/80 transition-all duration-300 cursor-pointer
              group hover:shadow-lg hover:border-white
              ${currentStage.color}
            `}
            title="Colek aku!"
          >
            {/* Tooltip hint on hover */}
            <div className="absolute -top-8 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
               Klik untuk ganti topik
            </div>

            <div className="whitespace-nowrap scale-110">{face}</div>
          </motion.button>
          
          {/* Rank Badge */}
          <div className={`mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm border border-white/50 ${currentStage.bg} ${currentStage.color}`}>
             {currentStage.title}
          </div>
        </div>

        {/* --- RIGHT: DIALOGUE & PROGRESS --- */}
        <div className="flex-1 w-full z-10">
           {/* Dialogue Bubble */}
           <div className="bg-white/70 rounded-2xl rounded-tl-sm p-5 shadow-sm border border-white/60 relative mb-4 min-h-[80px] flex items-center">
             <AnimatePresence mode='wait'>
                <motion.p 
                  key={message} // Trigger animation on message change
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 5 }}
                  transition={{ duration: 0.2 }}
                  className="text-slate-700 font-medium leading-relaxed italic"
                >
                  "{message}"
                </motion.p>
             </AnimatePresence>
             
             {/* Time Icon Indicator */}
             <div className="absolute top-2 right-2 opacity-20">
                {timeContext === 'morning' && <Coffee size={16} />}
                {timeContext === 'afternoon' && <Sun size={16} />}
                {timeContext === 'evening' && <CloudRain size={16} />}
                {timeContext === 'midnight' && <Moon size={16} />}
                {timeContext === 'weekend' && <Zap size={16} />}
             </div>
           </div>

           {/* Progress / Heart Bar */}
           <div className="space-y-2">
             <div className="flex justify-between items-end px-1">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center">
                 <Heart size={12} className={`mr-1 ${stageIndex >= 3 ? 'fill-rose-500 text-rose-500 animate-pulse' : 'text-slate-300'}`} />
                 Kedekatan
               </span>
               <span className="text-xs font-bold text-indigo-400">
                 {stats.totalQuizzes} <span className="text-slate-300 font-normal">Sesi</span>
               </span>
             </div>

             <div className="h-3 w-full bg-slate-200/50 rounded-full overflow-hidden relative border border-white/50">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${progress}%` }}
                 transition={{ duration: 1.5, ease: "easeOut" }}
                 className={`h-full rounded-full ${stageIndex >= 3 ? 'bg-gradient-to-r from-rose-400 to-pink-500' : 'bg-gradient-to-r from-indigo-300 to-indigo-500'}`}
               />
               
               {/* Shine effect */}
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
             </div>

             <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>Lv.{stageIndex}</span>
                {nextStage ? (
                   <span className="flex items-center opacity-70">
                     Next: {nextStage.title} ({nextStage.minXp} Quiz) <Lock size={8} className="ml-1" />
                   </span>
                ) : (
                  <span className="flex items-center text-rose-500 font-bold">
                    Max Level! <Sparkles size={8} className="ml-1" />
                  </span>
                )}
             </div>
           </div>

           {/* Action Buttons */}
           <div className="mt-5 flex gap-3">
             <button 
                onClick={onOpenScheduler}
                className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm"
             >
               <Calendar size={14} className="mr-2" />
               Janji Temu (Jadwal)
             </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
