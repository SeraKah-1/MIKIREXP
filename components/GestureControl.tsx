
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHandGesture } from '../hooks/useHandGesture';
import { Camera } from 'lucide-react';

interface GestureControlProps {
  onOptionSelect: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  isAnswered: boolean;
}

export const GestureControl: React.FC<GestureControlProps> = ({ 
  onOptionSelect, onNext, onPrev, isAnswered 
}) => {
  
  const handleTrigger = (gesture: string) => {
    if (gesture === 'BACK') {
        onPrev(); 
    } 
    else if (gesture === 'NEXT' || (isAnswered && ['1','2','3','4'].includes(gesture))) {
        onNext();
    }
    else if (!isAnswered) {
        if (gesture === '1') onOptionSelect(0);
        if (gesture === '2') onOptionSelect(1);
        if (gesture === '3') onOptionSelect(2);
        if (gesture === '4') onOptionSelect(3);
    }
  };

  const { canvasRef, isLoaded, error, detectedGesture, dwellProgress, stream } = useHandGesture(handleTrigger, false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (error) return null;

  const getGestureLabel = (g: string | null) => {
      if (!g) return "";
      if (g === 'NEXT') return "LANJUT";
      if (g === 'BACK') return "KEMBALI";
      if (['1','2','3','4'].includes(g)) {
          const letters = ['A', 'B', 'C', 'D'];
          return letters[parseInt(g) - 1];
      }
      return g;
  };

  const displayLabel = getGestureLabel(detectedGesture);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none gap-4">
       
       {/* FEEDBACK BUBBLE (Modern & Clean) */}
       <AnimatePresence>
          {detectedGesture && (
             <motion.div 
               initial={{ y: 20, opacity: 0, scale: 0.8, filter: "blur(4px)" }}
               animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
               exit={{ y: 10, opacity: 0, scale: 0.9, filter: "blur(2px)" }}
               transition={{ type: "spring", stiffness: 300, damping: 25 }}
               className="bg-white/90 backdrop-blur-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl p-3 pr-5 flex items-center gap-4 pointer-events-auto"
             >
                {/* Progress Ring mimicking the A/B/C/D buttons */}
                <div className="relative w-12 h-12 flex items-center justify-center bg-slate-50 rounded-full shadow-inner">
                   <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
                      <circle 
                        cx="24" cy="24" r="20" 
                        stroke="#8b5cf6" /* Menggunakan warna ungu/indigo soft sesuai gradien atas app lu */
                        strokeWidth="4" 
                        fill="transparent"
                        strokeDasharray={125}
                        strokeDashoffset={125 - ((dwellProgress / 100) * 125)}
                        strokeLinecap="round"
                        className="transition-all duration-75 ease-linear"
                      />
                   </svg>
                   <span className="absolute text-xl font-bold text-slate-700">
                      {['LANJUT', 'KEMBALI'].includes(displayLabel) ? (displayLabel === 'LANJUT' ? '⏭' : '⏮') : displayLabel}
                   </span>
                </div>
                
                <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
                      {detectedGesture === 'NEXT' || detectedGesture === 'BACK' ? 'Navigasi' : 'Pilihan'}
                   </span>
                   <span className="text-sm font-bold text-slate-700 leading-tight">
                      {dwellProgress >= 100 ? "Terkonfirmasi" : "Tahan..."}
                   </span>
                </div>
             </motion.div>
          )}
       </AnimatePresence>

       {/* CAMERA FEED (Glassmorphism & Full Color) */}
       <motion.div 
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         className="relative w-32 h-24 md:w-48 md:h-36 bg-black/5 backdrop-blur-sm rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/50 pointer-events-auto"
       >
          {/* We need to append the video element here if it's not already in DOM, or just let useHandGesture manage it. 
              Actually useHandGesture creates a video element but doesn't append it to DOM.
              If we want to see it, we should append it or render it here.
              Let's modify useHandGesture to return the videoRef so we can render it if we want, 
              OR we can just render a video element here and pass the ref to the hook?
              The hook currently creates its own video element if ref is null.
              Let's pass a ref from here to the hook? No, the hook manages it.
              Let's just render the video element here and pass the ref?
              Wait, useHandGesture defines videoRef internally.
              Let's update useHandGesture to accept a videoRef or return one.
              Currently it returns { canvasRef, ...state }.
              I'll update useHandGesture to return videoRef.
          */}
          {/* Actually, since the hook creates the video element internally if not provided, 
              and we want to display it, we should probably render the video element HERE 
              and pass the ref to the hook, OR have the hook return the ref and we attach it?
              React refs don't work like that easily (attaching a ref from a hook to a rendered element).
              
              Better approach: Render <video> here, pass ref to hook.
          */}
          <video 
             ref={videoRef}
             autoPlay 
             playsInline 
             muted 
             className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" 
          />
          
          {/* Video is now global, we just show the canvas overlay here */}
          <canvas 
             ref={canvasRef} 
             className="absolute inset-0 w-full h-full transform -scale-x-100" 
          />
          
          {/* Subtle Indicator */}
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

          {!isLoaded && (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 backdrop-blur-sm">
                <Camera className="animate-pulse text-slate-400" size={20} />
             </div>
          )}
       </motion.div>
    </div>
  );
};
