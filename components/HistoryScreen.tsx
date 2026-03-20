
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Clock, Edit3, Edit2, MoreVertical, Search, RefreshCw, Cloud, HardDrive, Layout, TrendingUp, Zap, Skull, CloudUpload, Play, Trash2, Tag, AlertCircle, CheckCircle2, Download, Book, Folder, FileText, Upload, ChevronRight, Hash, Plus, Ghost, MessageSquare, Save, X, User, Globe, Layers } from 'lucide-react';
import { auth } from '../firebase';
import { 
  getSavedQuizzes, renameQuiz, deleteQuiz,
  updateLocalQuizQuestions,
  processAndSaveToLibrary, getLibraryItems, deleteLibraryItem, updateLibraryItem,
  getGraveyard, removeFromGraveyard, reprocessLibraryItem, clearGraveyard,
  uploadQuizToCloud, downloadQuizFromCloud, getCloudQuizzes
} from '../services/storageService';
import { EditQuizModal } from './EditQuizModal';
import { ChatScreen } from './ChatScreen';
import { QuizMode, LibraryItem, Question } from '../types';

interface HistoryScreenProps {
  onLoadHistory: (quiz: any) => void;
  onStartFlashcards: (questions: Question[]) => void;
  onImportQuiz: (file: File) => void;
}

// --- UTILS ---
const getModeBadge = (mode: string) => {
  switch(mode) {
    case QuizMode.SURVIVAL: return { icon: Skull, label: 'Survival', color: 'bg-rose-100 text-rose-600 border-rose-200' };
    case QuizMode.SCAFFOLDING: return { icon: TrendingUp, label: 'Bertahap', color: 'bg-blue-100 text-blue-600 border-blue-200' };
    default: return { icon: Layout, label: 'Standard', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' };
  }
};

const getScoreColor = (score: number | null) => {
  if (score === null || score === undefined) return "bg-slate-100 text-slate-400 border-slate-200";
  if (score >= 80) return "bg-emerald-100 text-emerald-600 border-emerald-200";
  if (score >= 60) return "bg-indigo-100 text-indigo-600 border-indigo-200";
  return "bg-rose-100 text-rose-600 border-rose-200";
};

// --- WORKSPACE COMPONENT (NOTION-LIKE) ---
export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onLoadHistory, onStartFlashcards, onImportQuiz }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'quizzes' | 'graveyard'>('library');
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [graveyardItems, setGraveyardItems] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(""); // Feedback state
  const [processingProgress, setProcessingProgress] = useState({ done: 0, total: 0 });
  
  // Chat State
  const [activeChatContext, setActiveChatContext] = useState<{ text: string, file: File | null } | null>(null);

  // Edit Library Item State
  const [editingLibraryId, setEditingLibraryId] = useState<string | number | null>(null);
  const [editLibraryTitle, setEditLibraryTitle] = useState("");
  const [editLibraryTags, setEditLibraryTags] = useState("");

  // Quiz Specific States
  const [viewMode, setViewMode] = useState<'local' | 'cloud'>('local');
  const [cloudFilter, setCloudFilter] = useState<'public' | 'mine'>('public');
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | 'survival' | 'low_score' | 'new'>('all');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      refreshQuizzes();
    });
    return () => unsubscribe();
  }, []);

  // Upload Modal State
  const [uploadModal, setUploadModal] = useState<{ quiz: any, isOpen: boolean }>({ quiz: null, isOpen: false });
  const [uploadVisibility, setUploadVisibility] = useState<'public' | 'private' | 'unlisted'>('private');
  const [uploadAccessCode, setUploadAccessCode] = useState('');

  useEffect(() => {
    refreshAll();
  }, []);

  const handleOpenUploadModal = (quiz: any) => {
    setUploadModal({ quiz, isOpen: true });
    setUploadVisibility('private');
    setUploadAccessCode('');
  };

  const handleConfirmUpload = async () => {
    if (!uploadModal.quiz) return;
    setIsLoading(true);
    try {
      await uploadQuizToCloud(uploadModal.quiz, uploadVisibility, uploadAccessCode);
      alert("Berhasil diunggah ke cloud! 🚀");
      setUploadModal({ quiz: null, isOpen: false });
      refreshQuizzes();
    } catch (err: any) {
      alert("Gagal upload: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([refreshLibrary(), refreshQuizzes(), refreshGraveyard()]);
    setIsLoading(false);
  };

  const refreshLibrary = async () => {
    const items = await getLibraryItems();
    setLibraryItems(items);
  };

  const refreshGraveyard = async () => {
     const items = await getGraveyard();
     setGraveyardItems(items);
  };

  const handleDownloadQuiz = async (quiz: any) => {
    if (confirm("Download kuis ini ke penyimpanan lokal agar bisa dimainkan offline?")) {
       try {
          await downloadQuizFromCloud(quiz);
          alert("Kuis berhasil diunduh ke riwayat lokal!");
          refreshQuizzes();
       } catch (e) {
          alert("Gagal download: " + (e instanceof Error ? e.message : String(e)));
       }
    }
  };

  const refreshQuizzes = async () => {
    // Only refresh if we have a user or we are in local mode
    if (viewMode === 'cloud' && !auth.currentUser && cloudFilter === 'mine') {
      setQuizHistory([]);
      return;
    }

    setIsLoading(true);
    try {
      if (viewMode === 'local') {
        const data = await getSavedQuizzes();
        setQuizHistory(data);
      } else {
        const data = await getCloudQuizzes(cloudFilter);
        setQuizHistory(data);
      }
    } catch (err) {
      console.error("Refresh quizzes failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refreshQuizzes(); }, [viewMode, cloudFilter]);

  // --- LIBRARY ACTIONS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const files = Array.from(e.target.files) as File[];
    
    // SAFETY: Per-file limit (inline base64 limit ~15MB raw)
    const oversizedFile = files.find(f => f.size > 15 * 1024 * 1024);
    if (oversizedFile) {
       alert(`File ${oversizedFile.name} terlalu besar (>15MB). Harap gunakan file yang lebih kecil.`);
       return;
    }
    
    // SAFETY: Limit total upload size to 15MB
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    if (totalSize > 15 * 1024 * 1024) {
       alert("Total ukuran file terlalu besar (>15MB). Harap upload bertahap.");
       return;
    }

    setIsProcessingFile(true);
    setProcessingProgress({ done: 0, total: files.length });
    
    let successCount = 0;

    const CHUNK_SIZE = 3;
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
       const chunk = files.slice(i, i + CHUNK_SIZE);
       await Promise.all(
         chunk.map(async (file) => {
           try {
             setProcessingStatus(`Mengupload ${file.name}...`);
             let content: string | File = file;
             let type: 'pdf' | 'text' = 'text';

             if (file.name.endsWith('.pdf')) {
                type = 'pdf';
             } else {
                content = await file.text();
             }

             // Use processAndSaveToLibrary which tries to summarize immediately
             // If it fails, it saves raw. We can re-process later.
             setProcessingStatus(`Analisis AI: ${file.name}...`);
             await processAndSaveToLibrary(file.name, content, type);

             successCount++;
             setProcessingProgress(prev => ({ ...prev, done: prev.done + 1 }));
           } catch (err) {
             console.error("Failed to process", file.name, err);
           }
         })
       );
    }
    
    setIsProcessingFile(false);
    setProcessingStatus("");
    refreshLibrary();
  };

  const handleBatchProcessUncached = async () => {
    // Filter items that are "Raw" (processedContent same as content or missing)
    // Note: processAndSaveToLibrary sets processedContent = content as fallback.
    // Ideally we check if processedContent starts with "[SMART CACHE"
    const uncachedItems = libraryItems.filter(item => 
        !item.processedContent || !item.processedContent.includes("[SMART CACHE")
    );

    if (uncachedItems.length === 0) {
        alert("Semua item sudah di-cache dengan optimal!");
        return;
    }

    setIsProcessingFile(true);
    setProcessingProgress({ done: 0, total: uncachedItems.length });

    for (const item of uncachedItems) {
        setProcessingStatus(`Memproses ${item.title}...`);
        await reprocessLibraryItem(item);
        setProcessingProgress(prev => ({ ...prev, done: prev.done + 1 }));
    }

    setIsProcessingFile(false);
    setProcessingStatus("");
    refreshLibrary();
  };

  const handleDeleteLibraryItem = async (id: string | number) => {
    if (confirm("Hapus materi ini dari Library?")) {
      await deleteLibraryItem(id);
      refreshLibrary();
    }
  };

  const handleEditLibraryItem = (item: LibraryItem) => {
    setEditingLibraryId(item.id);
    setEditLibraryTitle(item.title);
    setEditLibraryTags(item.tags ? item.tags.join(', ') : '');
  };

  const handleSaveLibraryItem = async (id: string | number) => {
    const tagsArray = editLibraryTags.split(',').map(t => t.trim()).filter(t => t);
    await updateLibraryItem(id, { title: editLibraryTitle, tags: tagsArray });
    setEditingLibraryId(null);
    refreshLibrary();
  };

  const handleOpenChat = (item: LibraryItem) => {
    // Create a dummy file object just for the name display in ChatScreen
    const dummyFile = new File([""], item.title, { type: "text/plain" });
    setActiveChatContext({
      text: item.processedContent || item.content,
      file: dummyFile
    });
  };

  // --- QUIZ ACTIONS ---
  const handleDeleteQuiz = async (id: number | string) => {
    if (confirm("Hapus kuis ini?")) {
      await deleteQuiz(id);
      refreshQuizzes();
    }
  };

  // --- GRAVEYARD ACTIONS ---
  const handleResurrect = (q: Question) => {
     onLoadHistory({
        id: Date.now(),
        fileName: "Latihan Kuburan Soal",
        questions: [q],
        mode: QuizMode.STANDARD,
        questionCount: 1
     });
  };

  const handleBanish = (text: string) => {
     removeFromGraveyard(text);
     refreshGraveyard();
  };

  const handleClearGraveyard = async () => {
     if (confirm("Kosongkan semua soal di Kuburan? Ini tidak dapat dibatalkan.")) {
        setIsLoading(true);
        try {
           await clearGraveyard();
           refreshGraveyard();
           alert("Kuburan berhasil dikosongkan!");
        } catch (e: any) {
           alert("Gagal mengosongkan: " + e.message);
        } finally {
           setIsLoading(false);
        }
     }
  };

  const filteredQuizzes = useMemo(() => {
    return quizHistory.filter(item => {
      if (searchQuery && !item.fileName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (activeFilter === 'survival' && item.mode !== QuizMode.SURVIVAL) return false;
      if (activeFilter === 'low_score' && (item.lastScore === null || item.lastScore >= 60)) return false;
      if (activeFilter === 'new' && item.lastScore !== null && item.lastScore !== undefined) return false;
      return true;
    });
  }, [quizHistory, searchQuery, activeFilter]);

  // Calc uncached count
  const uncachedCount = libraryItems.filter(item => !item.processedContent || !item.processedContent.includes("[SMART CACHE")).length;

  return (
    <div className="max-w-6xl mx-auto pt-4 pb-24 px-4 min-h-[90vh] text-theme-text flex flex-col md:flex-row gap-6">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="w-full md:w-64 shrink-0 space-y-6">
         <div className="bg-theme-glass border border-theme-border rounded-2xl p-4 shadow-sm sticky top-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Workspace</h2>
            
            <nav className="space-y-1">
               <button 
                 onClick={() => setActiveTab('library')}
                 className={`w-full flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'library' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
               >
                 <Book size={18} className="mr-3 text-indigo-500" /> Library Materi
                 {uncachedCount > 0 && <span className="ml-auto w-2 h-2 bg-amber-500 rounded-full" title={`${uncachedCount} Uncached`} />}
               </button>
               <button 
                 onClick={() => setActiveTab('quizzes')}
                 className={`w-full flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'quizzes' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
               >
                 <History size={18} className="mr-3 text-pink-500" /> Riwayat Quiz
               </button>
               <button 
                 onClick={() => { setActiveTab('graveyard'); refreshGraveyard(); }}
                 className={`w-full flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'graveyard' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
               >
                 <Ghost size={18} className={`mr-3 ${activeTab === 'graveyard' ? 'text-white' : 'text-slate-800'}`} /> Kuburan Soal
                 {graveyardItems.length > 0 && <span className="ml-auto bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{graveyardItems.length}</span>}
               </button>
            </nav>

            <div className="mt-8">
               <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Quick Stats</h2>
               <div className="bg-white/50 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex justify-between"><span>Materi:</span> <span className="font-bold">{libraryItems.length}</span></div>
                  <div className="flex justify-between"><span>Quiz:</span> <span className="font-bold">{quizHistory.length}</span></div>
                  <div className="flex justify-between"><span>Smart Cache:</span> <span className="font-bold text-emerald-600">{libraryItems.length - uncachedCount}</span></div>
               </div>
            </div>
         </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 bg-theme-glass border border-theme-border rounded-[2rem] p-6 md:p-8 min-h-[500px] shadow-xl relative overflow-hidden">
         
         {/* --- LIBRARY VIEW --- */}
         {activeTab === 'library' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200/60 pb-4">
                  <div>
                     <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Folder size={24} className="text-indigo-500"/> Library Materi</h1>
                     <p className="text-sm text-slate-500">Materi akan diringkas AI otomatis (Cached).</p>
                  </div>
                  
                  <div className="flex gap-2">
                     {uncachedCount > 0 && (
                        <button 
                           onClick={handleBatchProcessUncached} 
                           disabled={isProcessingFile}
                           className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold shadow hover:bg-amber-200 transition-all flex items-center"
                        >
                           <Zap size={16} className="mr-2" /> 
                           {isProcessingFile ? "Memproses..." : `Proses ${uncachedCount} Item`}
                        </button>
                     )}
                     <button onClick={() => document.getElementById('lib-upload')?.click()} disabled={isProcessingFile} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow hover:bg-indigo-700 transition-all flex items-center">
                        {isProcessingFile ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Upload size={16} className="mr-2" />}
                        Upload
                     </button>
                     <input type="file" id="lib-upload" multiple className="hidden" accept=".pdf,.txt,.md" onChange={handleFileUpload} />
                  </div>
               </div>

               {isProcessingFile && (
                  <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-3 rounded-xl text-sm mb-4">
                     <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center font-bold"><RefreshCw className="animate-spin mr-3" size={18}/> {processingStatus}</span>
                        <span className="text-xs font-mono">{processingProgress.done}/{processingProgress.total}</span>
                     </div>
                     <div className="w-full bg-indigo-200 rounded-full h-1.5 overflow-hidden">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${(processingProgress.done / Math.max(1, processingProgress.total)) * 100}%` }}
                           className="bg-indigo-600 h-full rounded-full"
                        />
                     </div>
                  </div>
               )}

               {isLoading ? (
                  <div className="space-y-3">
                     {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl animate-pulse">
                           <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0"></div>
                           <div className="flex-1 space-y-2">
                              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                              <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                           </div>
                           <div className="w-24 h-8 bg-slate-200 rounded-lg"></div>
                        </div>
                     ))}
                  </div>
               ) : libraryItems.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
                     <Book size={48} className="mx-auto text-slate-300 mb-4" />
                     <p className="text-slate-500 font-medium">Library masih kosong.</p>
                     <p className="text-xs text-slate-400 mt-1">Upload PDF/Catatan agar bisa dipakai berulang kali.</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 gap-3">
                     {libraryItems.map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:border-indigo-200 transition-all gap-4">
                           <div className="flex items-center gap-4 overflow-hidden w-full">
                              <div className={`p-3 rounded-xl shrink-0 ${item.type === 'pdf' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                 <FileText size={20} />
                              </div>
                              <div className="min-w-0 flex-1">
                                 {editingLibraryId === item.id ? (
                                    <div className="space-y-2 w-full">
                                       <input 
                                          type="text" 
                                          value={editLibraryTitle} 
                                          onChange={e => setEditLibraryTitle(e.target.value)} 
                                          className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
                                          placeholder="Judul Materi"
                                       />
                                       <input 
                                          type="text" 
                                          value={editLibraryTags} 
                                          onChange={e => setEditLibraryTags(e.target.value)} 
                                          className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-600 focus:outline-none focus:border-indigo-500"
                                          placeholder="Tags (pisahkan dengan koma)"
                                       />
                                    </div>
                                 ) : (
                                    <>
                                       <h3 className="font-bold text-slate-700 truncate">{item.title}</h3>
                                       <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                                          <span className="uppercase font-bold tracking-wider text-[9px]">{item.type}</span>
                                          <span>•</span>
                                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                          {item.processedContent && item.processedContent.includes("[SMART CACHE") ? (
                                             <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-1">
                                                <Zap size={8} /> CACHED
                                             </span>
                                          ) : (
                                             <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold">RAW</span>
                                          )}
                                          {item.tags && item.tags.length > 0 && (
                                             <>
                                                <span>•</span>
                                                <div className="flex gap-1">
                                                   {item.tags.map((tag, i) => (
                                                      <span key={i} className="bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center">
                                                         <Tag size={8} className="mr-0.5" /> {tag}
                                                      </span>
                                                   ))}
                                                </div>
                                             </>
                                          )}
                                       </div>
                                    </>
                                 )}
                              </div>
                           </div>
                           <div className="flex gap-2 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-all w-full md:w-auto justify-end">
                              {editingLibraryId === item.id ? (
                                 <>
                                    <button onClick={() => handleSaveLibraryItem(item.id)} className="p-2 text-emerald-500 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors" title="Simpan">
                                       <Save size={18} />
                                    </button>
                                    <button onClick={() => setEditingLibraryId(null)} className="p-2 text-slate-400 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" title="Batal">
                                       <X size={18} />
                                    </button>
                                 </>
                              ) : (
                                 <>
                                    <button onClick={() => handleOpenChat(item)} className="p-2 text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors" title="Chat dengan Materi">
                                       <MessageSquare size={18} />
                                    </button>
                                    <button onClick={() => handleEditLibraryItem(item)} className="p-2 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors" title="Edit Materi">
                                       <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDeleteLibraryItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus">
                                       <Trash2 size={18} />
                                    </button>
                                 </>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </motion.div>
         )}

         {/* --- QUIZZES VIEW --- */}
         {activeTab === 'quizzes' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200/60 pb-4">
                  <div>
                     <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><History size={24} className="text-pink-500"/> Riwayat Quiz</h1>
                     <p className="text-sm text-slate-500">Arsip nilai dan soal latihan.</p>
                  </div>
                  
                  {/* View Switcher */}
                  <div className="flex gap-2">
                     {viewMode === 'cloud' && currentUser && (
                        <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner shrink-0 mr-2">
                           <button onClick={() => setCloudFilter('mine')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${cloudFilter === 'mine' ? 'bg-white shadow text-purple-600' : 'text-slate-400'}`}><User size={12} /> My Cloud</button>
                           <button onClick={() => setCloudFilter('public')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${cloudFilter === 'public' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}><Globe size={12} /> Public</button>
                        </div>
                     )}
                     <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner shrink-0">
                        <button onClick={() => setViewMode('local')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'local' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>Local</button>
                        <button onClick={() => setViewMode('cloud')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'cloud' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>Cloud</button>
                     </div>
                     <button 
                        onClick={() => document.getElementById('quiz-import')?.click()} 
                        className="bg-pink-100 text-pink-600 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm hover:bg-pink-200 transition-all flex items-center gap-1"
                     >
                        <Upload size={14} /> Import
                     </button>
                     <input 
                        type="file" 
                        id="quiz-import" 
                        className="hidden" 
                        accept=".mikir,.json" 
                        onChange={(e) => e.target.files && onImportQuiz(e.target.files[0])} 
                     />
                  </div>
               </div>

               {/* Filters */}
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['all', 'survival', 'low_score', 'new'].map(f => (
                     <button key={f} onClick={() => setActiveFilter(f as any)} className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${activeFilter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>
                        {f.replace('_', ' ')}
                     </button>
                  ))}
               </div>

               <div className="space-y-3">
                  {isLoading ? (
                     [1, 2, 3].map(i => (
                        <div key={i} className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between animate-pulse">
                           <div className="flex items-center gap-4 overflow-hidden w-full">
                              <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0"></div>
                              <div className="flex-1 space-y-2">
                                 <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                 <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                              </div>
                           </div>
                        </div>
                     ))
                  ) : filteredQuizzes.length === 0 ? (
                     <div className="text-center py-10 text-slate-400 text-sm">Tidak ada data quiz.</div>
                  ) : (
                     filteredQuizzes.map((quiz, idx) => {
                        const scoreColor = getScoreColor(quiz.lastScore);
                        return (
                           <div key={`${quiz.id}-${idx}`} onClick={() => onLoadHistory(quiz)} className="bg-white border border-slate-200 p-4 rounded-2xl hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group">
                              <div className="flex items-center gap-4 overflow-hidden">
                                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border ${scoreColor}`}>
                                    {quiz.lastScore ?? "-"}
                                 </div>
                                 <div className="min-w-0">
                                    <h3 className="font-bold text-slate-700 truncate">{quiz.fileName}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                       <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">{quiz.mode}</span>
                                       <span>{quiz.questionCount} Soal</span>
                                       <span>•</span>
                                       <span>{new Date(quiz.date).toLocaleDateString()}</span>
                                       {quiz.folder && (
                                          <>
                                             <span>•</span>
                                             <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                                <Folder size={10} /> {quiz.folder}
                                             </span>
                                          </>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); onStartFlashcards(quiz.questions); }} 
                                    className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg" 
                                    title="Buka Flashcard"
                                 >
                                    <Layers size={18} />
                                 </button>
                                 {viewMode === 'local' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenUploadModal(quiz); }} className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Bagikan / Ubah Akses">
                                       <CloudUpload size={18} />
                                    </button>
                                 )}
                                 {viewMode === 'cloud' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDownloadQuiz(quiz); }} className="p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Download ke Local">
                                       <Download size={18} />
                                    </button>
                                 )}
                                 <button onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.id); }} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg" title="Hapus">
                                    <Trash2 size={18} />
                                 </button>
                              </div>
                           </div>
                        )
                     })
                  )}
               </div>
            </motion.div>
         )}

         {/* --- GRAVEYARD VIEW --- */}
         {activeTab === 'graveyard' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                 <div className="flex justify-between items-center mb-6 border-b border-slate-200/60 pb-4">
                  <div>
                     <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Ghost size={24} className="text-slate-800"/> Kuburan Soal</h1>
                     <p className="text-sm text-slate-500">Tempat soal-soal yang pernah kamu jawab salah.</p>
                  </div>
                  
                  {graveyardItems.length > 0 && (
                     <button onClick={handleClearGraveyard} className="bg-rose-100 text-rose-600 hover:bg-rose-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center">
                        <Trash2 size={16} className="mr-2" /> Kosongkan
                     </button>
                  )}
               </div>

               {isLoading ? (
                  <div className="grid grid-cols-1 gap-4">
                     {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col md:flex-row gap-4 animate-pulse">
                           <div className="flex-1 space-y-3">
                              <div className="w-24 h-5 bg-rose-100 rounded"></div>
                              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                              <div className="h-8 bg-slate-50 rounded border border-slate-100 w-full"></div>
                           </div>
                           <div className="flex flex-row md:flex-col gap-2 shrink-0 justify-center">
                              <div className="w-24 h-8 bg-indigo-200 rounded-xl"></div>
                              <div className="w-24 h-8 bg-slate-200 rounded-xl"></div>
                           </div>
                        </div>
                     ))}
                  </div>
               ) : graveyardItems.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-100">
                     <Ghost size={48} className="mx-auto text-slate-300 mb-4 animate-bounce" />
                     <p className="text-slate-600 font-bold">Kuburan Kosong!</p>
                     <p className="text-xs text-slate-400 mt-1">Hebat, kamu belum melakukan kesalahan fatal.</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 gap-4">
                     {graveyardItems.map((q, i) => (
                        <div key={`${q.id}-${i}`} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4">
                           <div className="flex-1">
                              <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-1 rounded font-bold uppercase tracking-wider mb-2 inline-block">Salah pada {new Date(q.buriedAt || Date.now()).toLocaleDateString()}</span>
                              <p className="font-bold text-slate-800 mb-2">{q.text}</p>
                              <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded italic border border-slate-100">
                                 Kunci: <span className="font-bold text-emerald-600">{q.type === 'FILL_BLANK' ? q.correctAnswer : q.options[q.correctIndex]}</span>
                              </p>
                           </div>
                           <div className="flex flex-row md:flex-col gap-2 shrink-0 justify-center">
                              <button onClick={() => handleResurrect(q)} className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">
                                 <RefreshCw size={14} className="mr-2" /> Coba Lagi
                              </button>
                              <button onClick={() => handleBanish(q.text)} className="flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-200">
                                 <Trash2 size={14} className="mr-2" /> Hapus
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </motion.div>
         )}

      </div>
      
      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Bagikan Kuis</h3>
              <p className="text-sm text-slate-500 mb-6">Kuis ini sudah aman di Cloud Pribadi kamu. Atur visibilitas jika ingin membagikan kuis ini ke publik.</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Visibilitas</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setUploadVisibility('private')} className={`p-2 rounded-xl text-xs font-bold border ${uploadVisibility === 'private' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>Private</button>
                    <button onClick={() => setUploadVisibility('unlisted')} className={`p-2 rounded-xl text-xs font-bold border ${uploadVisibility === 'unlisted' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}>Unlisted</button>
                    <button onClick={() => setUploadVisibility('public')} className={`p-2 rounded-xl text-xs font-bold border ${uploadVisibility === 'public' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200'}`}>Public</button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {uploadVisibility === 'private' && "Hanya bisa diakses oleh Anda (jika login) atau via Direct Link."}
                    {uploadVisibility === 'unlisted' && "Tidak muncul di pencarian, tapi bisa diakses dengan Kode PIN."}
                    {uploadVisibility === 'public' && "Muncul di Library Publik. Semua orang bisa main."}
                  </p>
                </div>

                {uploadVisibility === 'unlisted' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Kode Akses (PIN)</label>
                    <input 
                      type="text" 
                      value={uploadAccessCode} 
                      onChange={(e) => setUploadAccessCode(e.target.value)} 
                      placeholder="Contoh: 123456" 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setUploadModal({ quiz: null, isOpen: false })} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200">Batal</button>
                <button onClick={handleConfirmUpload} disabled={isLoading} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center">
                  {isLoading ? <RefreshCw className="animate-spin mr-2" size={16} /> : <CloudUpload className="mr-2" size={16} />}
                  Simpan Pengaturan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeChatContext && (
          <ChatScreen 
            contextText={activeChatContext.text} 
            sourceFile={activeChatContext.file} 
            onClose={() => setActiveChatContext(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
