
import { useState, useEffect, useRef, useCallback } from 'react';

// --- COMMAND DICTIONARY (Fuzzy Matching) ---
// Kita memetakan berbagai kemungkinan suara ke aksi tertentu.
const COMMAND_MAP: Record<string, string[]> = {
  ANSWER_0: ['a', 'ah', 'eh', 'ha', 'satu', 'one', 'pilihan a', 'opsi a', 'yang a', 'ei'],
  ANSWER_1: ['b', 'be', 'beh', 'bee', 'dua', 'two', 'tu', 'pilihan b', 'opsi b', 'yang b', 'bi'],
  ANSWER_2: ['c', 'ce', 'seh', 'see', 'tiga', 'three', 'tri', 'pilihan c', 'opsi c', 'yang c', 'si'],
  ANSWER_3: ['d', 'de', 'deh', 'di', 'empat', 'four', 'for', 'pilihan d', 'opsi d', 'yang d', 'di'],
  NEXT: ['lanjut', 'next', 'nek', 'berikutnya', 'maju', 'skip', 'lewatin'],
  PREV: ['kembali', 'back', 'bek', 'sebelumnya', 'mundur', 'ulang'],
};

interface VoiceControlProps {
  onOptionSelect: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  isAnswered: boolean; // Context awareness: Kalau sudah dijawab, "A/B/C/D" mungkin tidak relevan, tapi "Next" relevan.
}

export const useVoiceControl = ({ onOptionSelect, onNext, onPrev, isAnswered }: VoiceControlProps) => {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Refs untuk menghindari stale closure di dalam event listener
  const callbacksRef = useRef({ onOptionSelect, onNext, onPrev, isAnswered });

  useEffect(() => {
    callbacksRef.current = { onOptionSelect, onNext, onPrev, isAnswered };
  }, [onOptionSelect, onNext, onPrev, isAnswered]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Browser Support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Jangan stop setelah satu kata
        recognition.interimResults = false; // Hanya ambil hasil final agar lebih akurat
        recognition.lang = 'id-ID'; // Prioritas Bahasa Indonesia

        recognition.onresult = (event: any) => {
          const lastResultIdx = event.results.length - 1;
          const transcript = event.results[lastResultIdx][0].transcript.trim().toLowerCase();
          setLastTranscript(transcript);
          processCommand(transcript);
        };

        recognition.onerror = (event: any) => {
          console.warn("Voice Error:", event.error);
          if (event.error === 'not-allowed') {
            setError("Akses mikrofon ditolak.");
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          // Auto-restart if it stops unexpectedly but state says listening
          // Note: Avoid infinite loop if permission denied
          if (recognitionRef.current && isListening && !error) {
             try { recognition.start(); } catch(e) {}
          } else {
             setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const processCommand = (text: string) => {
    const { onOptionSelect, onNext, onPrev, isAnswered } = callbacksRef.current;
    
    // Helper to check if text contains any keyword
    const matches = (keywords: string[]) => keywords.some(k => text.includes(k));

    let actionTaken = false;

    // 1. Navigation Commands (Always Active)
    if (matches(COMMAND_MAP.NEXT) || (isAnswered && (matches(COMMAND_MAP.ANSWER_0) || matches(['lanjut', 'ok', 'oke', 'sip'])))) { 
       // Context: If answered, saying "A" or "OK" can trigger Next for smoother flow
       onNext();
       setFeedbackMsg("➡️ Lanjut");
       actionTaken = true;
    } 
    else if (matches(COMMAND_MAP.PREV)) {
       onPrev();
       setFeedbackMsg("⬅️ Kembali");
       actionTaken = true;
    }

    // 2. Answering Commands (Only if not answered yet)
    if (!actionTaken && !isAnswered) {
      if (matches(COMMAND_MAP.ANSWER_0)) { onOptionSelect(0); setFeedbackMsg("🅰️ Pilihan A"); }
      else if (matches(COMMAND_MAP.ANSWER_1)) { onOptionSelect(1); setFeedbackMsg("🅱️ Pilihan B"); }
      else if (matches(COMMAND_MAP.ANSWER_2)) { onOptionSelect(2); setFeedbackMsg("©️ Pilihan C"); }
      else if (matches(COMMAND_MAP.ANSWER_3)) { onOptionSelect(3); setFeedbackMsg("De Pilihan D"); }
      else {
        setFeedbackMsg("❓ Tidak dikenali");
      }
    }
    
    // Clear feedback after 2 seconds
    setTimeout(() => setFeedbackMsg(''), 2000);
  };

  const toggleListening = useCallback(() => {
    if (!isSupported) {
      alert("Browser ini tidak mendukung Voice Command. Coba Chrome/Edge.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setError(null);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Start error:", e);
      }
    }
  }, [isListening, isSupported]);

  return { isListening, toggleListening, lastTranscript, feedbackMsg, isSupported, error };
};
