
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Question } from '../types';
import { GlassButton } from './GlassButton';

interface EditQuizModalProps {
  quizTitle: string;
  initialQuestions: Question[];
  onSave: (updatedQuestions: Question[]) => Promise<void>;
  onClose: () => void;
}

export const EditQuizModal: React.FC<EditQuizModalProps> = ({ quizTitle, initialQuestions, onSave, onClose }) => {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [isSaving, setIsSaving] = useState(false);

  // Handle Input Changes
  const handleTextChange = (idx: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions];
    const newOptions = [...updated[qIdx].options];
    newOptions[oIdx] = value;
    updated[qIdx] = { ...updated[qIdx], options: newOptions };
    setQuestions(updated);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (confirm("Hapus soal ini?")) {
      const updated = questions.filter((_, i) => i !== idx);
      setQuestions(updated);
    }
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: Date.now(),
      text: "Pertanyaan Baru...",
      options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      correctIndex: 0,
      explanation: "Penjelasan jawaban...",
      keyPoint: "Topik",
      difficulty: "Medium"
    };
    setQuestions([...questions, newQ]);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    await onSave(questions);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/90 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-4xl h-[90vh] rounded-[2rem] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div>
             <h2 className="text-xl font-bold text-slate-800 flex items-center">
               <span className="bg-indigo-100 text-indigo-600 px-2 py-1 rounded text-xs mr-2 uppercase tracking-wide">Admin Mode</span>
               Edit Soal
             </h2>
             <p className="text-slate-500 text-sm truncate max-w-md">{quizTitle}</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-100/50 custom-scrollbar">
           {questions.map((q, qIdx) => (
             <div key={qIdx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleDeleteQuestion(qIdx)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                </div>

                <div className="mb-4">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Pertanyaan #{qIdx + 1}</label>
                   <textarea 
                     className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                     rows={2}
                     value={q.text}
                     onChange={(e) => handleTextChange(qIdx, 'text', e.target.value)}
                   />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                   {q.options.map((opt, oIdx) => (
                     <div key={oIdx} className="flex items-center gap-2">
                        <input 
                          type="radio" 
                          name={`correct-${qIdx}`} 
                          checked={q.correctIndex === oIdx}
                          onChange={() => handleTextChange(qIdx, 'correctIndex', oIdx)}
                          className="accent-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={opt}
                          onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                          className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${q.correctIndex === oIdx ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-bold' : 'border-slate-200'}`}
                        />
                     </div>
                   ))}
                </div>

                <div>
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Penjelasan (Pembahasan)</label>
                   <textarea 
                     className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                     rows={2}
                     value={q.explanation}
                     onChange={(e) => handleTextChange(qIdx, 'explanation', e.target.value)}
                   />
                </div>
             </div>
           ))}

           <button 
             onClick={handleAddQuestion}
             className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold flex items-center justify-center hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
           >
              <Plus size={20} className="mr-2" /> Tambah Pertanyaan
           </button>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
           <button onClick={onClose} className="px-6 py-3 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl">Batal</button>
           <GlassButton onClick={saveChanges} disabled={isSaving} className="bg-indigo-600 text-white border-none hover:bg-indigo-700">
              {isSaving ? "Menyimpan..." : <><Save size={18} className="mr-2" /> Simpan Perubahan</>}
           </GlassButton>
        </div>
      </motion.div>
    </div>
  );
};
