
import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfigScreen } from './components/ConfigScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { QuizInterface } from './components/QuizInterface';
import { ResultScreen } from './components/ResultScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { VirtualRoom } from './components/VirtualRoom';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { MultiplayerLeaderboard } from './components/MultiplayerLeaderboard';
import { Navigation } from './components/Navigation';
import { NeuroSyncDashboard } from './components/NeuroSyncDashboard';
import { FlashcardScreen } from './components/FlashcardScreen';

import { generateQuiz } from './services/geminiService';
import { transformToMixed, shuffleOptions } from './services/questionTransformer'; 
import { 
  saveGeneratedQuiz, 
  getApiKey, 
  updateHistoryStats, 
  getSavedQuizzes, 
  deleteQuiz, 
  updateLocalQuizQuestions,
  syncAllFromCloud
} from './services/storageService'; 
import { createRetentionSequence, NeuroSync } from './services/srsService'; 
import { checkAndTriggerNotification } from './services/notificationService';
import { notifyQuizReady } from './services/kaomojiNotificationService'; 
import { initTheme } from './services/themeService'; 
import { QuizState, Question, QuizResult, ModelConfig, QuizMode, AppView, ExamStyle } from './types';
import { Info, CreditCard } from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { useAutoSave } from './hooks/useAutoSave';

const App: React.FC = () => {
  const {
    currentView, setCurrentView,
    quizState, setQuizState,
    questions, setQuestions,
    originalQuestions, setOriginalQuestions,
    result, setResult,
    activeQuizId, setActiveQuizId,
    lastConfig, setLastConfig,
    errorMsg, setErrorMsg,
    loadingStatus, setLoadingStatus,
    activeMode, setActiveMode,
    showAnalysis, setShowAnalysis,
    isMultiplayer, setIsMultiplayer,
    multiplayerRoomId, setMultiplayerRoomId,
    multiplayerPlayerId, setMultiplayerPlayerId,
    isHost, setIsHost,
    resetApp
  } = useAppStore();

  useAutoSave();

  useEffect(() => {
    initTheme();
    checkAndTriggerNotification();

    // Firebase Auth Listener for Cloud Sync
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User logged in, syncing from cloud...");
        syncAllFromCloud().then(() => {
          // Re-initialize theme after sync
          initTheme();
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const startQuizGeneration = async (files: File[] | null, config: ModelConfig) => {
    const apiKey = getApiKey(config.provider);
    
    if (!apiKey) {
      alert(`Harap masukkan API Key untuk Gemini.`);
      return;
    }

    const fileCount = files ? files.length : 0;
    
    // SAFETY CHECK: File Size
    if (files) {
       const totalSize = Array.from(files).reduce((acc, f) => acc + f.size, 0);
       if (totalSize > 50 * 1024 * 1024) { // 50MB hard limit
          alert("Total ukuran file terlalu besar (>50MB). Harap kurangi jumlah atau ukuran file.");
          return;
       }
    }

    const hasLibrary = config.libraryContext && config.libraryContext.length > 0;
    
    setLoadingStatus(hasLibrary ? "Membaca Library..." : (fileCount > 0 ? `Membaca ${fileCount} Dokumen...` : "Menganalisis Topik..."));
    setQuizState(QuizState.PROCESSING); 
    setErrorMsg(null);
    setActiveMode(config.mode);
    setLastConfig({ files, config }); 

    setTimeout(async () => {
        try {
          let generatedQuestions: Question[] = [];
          let finalContext = "";

          // --- GENERATION ROUTING ---
          const result = await generateQuiz(
            apiKey,
            files,
            config.topic,
            config.modelId, 
            config.questionCount, 
            config.mode,
            config.examStyle,
            (status) => setLoadingStatus(status),
            [],
            config.customPrompt,
            config.libraryContext 
          );
          generatedQuestions = result.questions;
          finalContext = result.contextText;
          
          if (!generatedQuestions || generatedQuestions.length === 0) {
            throw new Error("AI tidak menghasilkan soal. Coba topik lain.");
          }

          // --- APPLY CLIENT-SIDE TRANSFORMATIONS (AST 0 LATENCY) ---
          if (config.enableMixedTypes) {
             setLoadingStatus("Mengonversi Tipe Soal (Heuristic)...");
             generatedQuestions = transformToMixed(generatedQuestions);
          }

          // --- SHUFFLE OPTIONS (NEW) ---
          // Ensure options are randomized immediately after generation
          generatedQuestions = shuffleOptions(generatedQuestions);

          // --- APPLY RETENTION LOGIC ---
          setOriginalQuestions(generatedQuestions); // Save pure unique questions
          
          let playableQuestions = generatedQuestions;
          if (config.enableRetention) {
             setLoadingStatus("Menyusun Algoritma Retensi...");
             // Increase by ~60% (e.g. 10 -> 16 questions)
             playableQuestions = createRetentionSequence(generatedQuestions, 0.6);
          }
          
          setQuestions(playableQuestions);

          notifyQuizReady(playableQuestions.length);

          setLoadingStatus("Menyimpan Quiz...");
          try {
            const saveFileRef = files && files.length > 0 ? files[0] : null; 
            // Save ONLY ORIGINAL questions to history to save space/sanity
            await saveGeneratedQuiz(saveFileRef, config, generatedQuestions);
            const latest = await getSavedQuizzes();
            if (latest.length > 0) setActiveQuizId(latest[0].id);
          } catch (saveError) {
            console.error("Non-fatal error saving quiz:", saveError);
          }
          
          // CLEAR FILES FROM MEMORY after successful generation to prevent OOM
          setLastConfig({ files: null, config }); 
          
          setQuizState(QuizState.QUIZ_ACTIVE);

        } catch (error: any) {
          console.error("Generation Error:", error);
          setErrorMsg(error.message || "Terjadi kesalahan. Periksa API Key atau koneksi.");
          setQuizState(QuizState.ERROR);
        }
    }, 100);
  };

  const handleAddMoreQuestions = async (count: number) => {
    if (!lastConfig) return;
    setLoadingStatus(`Meracik ${count} soal tambahan...`);
    setQuizState(QuizState.PROCESSING);

    setTimeout(async () => {
        try {
            const existingTexts = originalQuestions.map(q => q.text);
            const apiKey = getApiKey(lastConfig.config.provider);
            if (!apiKey) throw new Error("API Key missing");
            let newQuestions: Question[] = [];
            const { files, config } = lastConfig;
      
            if (config.provider === 'gemini') {
              const res = await generateQuiz(
                apiKey, files, config.topic, config.modelId, count, config.mode, config.examStyle,
                (status) => setLoadingStatus(status),
                existingTexts,
                config.customPrompt,
                config.libraryContext
              );
              newQuestions = res.questions;
            }
            
            // --- TRANSFORM NEW QUESTIONS TOO ---
            if (config.enableMixedTypes) {
               newQuestions = transformToMixed(newQuestions);
            }

            // --- SHUFFLE OPTIONS ---
            newQuestions = shuffleOptions(newQuestions);

            const maxId = Math.max(...(originalQuestions || []).map(q => q?.id || 0), 0);
            const indexedNewQuestions = (newQuestions || []).filter(q => q).map((q, i) => ({ ...q, id: maxId + i + 1 }));
            
            // Merge Originals
            const mergedOriginals = [...(originalQuestions || []), ...indexedNewQuestions];
            setOriginalQuestions(mergedOriginals);
            
            // Merge Playables (Use retention if previously enabled)
            let finalPlayable = mergedOriginals;
            if (config.enableRetention) {
               finalPlayable = createRetentionSequence(mergedOriginals, 0.6);
            }
            
            setQuestions(finalPlayable);
            
            if (activeQuizId) { await updateLocalQuizQuestions(activeQuizId, mergedOriginals); }
            setResult(null); 
            setQuizState(QuizState.QUIZ_ACTIVE); 
      
          } catch (e: any) {
            alert("Gagal menambah soal: " + e.message);
            setQuestions(originalQuestions); 
            setQuizState(QuizState.RESULTS); 
          }
    }, 100);
  };

  const handleImportQuiz = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        if (!importedData.questions || !Array.isArray(importedData.questions)) {
          throw new Error("Format file kuis tidak valid.");
        }

        setLoadingStatus("Mengimpor Kuis...");
        setQuizState(QuizState.PROCESSING);

        // Save to local history
        await saveGeneratedQuiz(null, {
          provider: importedData.provider || 'gemini',
          modelId: importedData.modelId || 'imported',
          questionCount: importedData.questions.length,
          mode: importedData.mode || QuizMode.STANDARD,
          examStyle: importedData.examStyle || [ExamStyle.C2_CONCEPT],
          topic: importedData.fileName || "Imported Quiz"
        }, importedData.questions);

        const latest = await getSavedQuizzes();
        if (latest.length > 0) {
           handleLoadHistory(latest[0]);
        }
        
        alert("Kuis berhasil diimpor!");
      } catch (err: any) {
        alert("Gagal impor kuis: " + err.message);
        setQuizState(QuizState.CONFIG);
      }
    };
    reader.readAsText(file);
  };
  
  const handleLoadHistory = (savedQuiz: any) => {
    const freshQuestions = savedQuiz.questions;
    
    setQuestions(freshQuestions);
    setOriginalQuestions(freshQuestions);
    setActiveMode(savedQuiz.mode);
    setActiveQuizId(savedQuiz.id);
    setErrorMsg(null);
    setResult(null);
    setQuizState(QuizState.QUIZ_ACTIVE);
    
    // Fallback for old history records that might have single string examStyle
    const rawExamStyle = savedQuiz.examStyle || savedQuiz.tags?.find((t:string) => t.startsWith('C'));
    const styles = Array.isArray(rawExamStyle) ? rawExamStyle : (rawExamStyle ? [rawExamStyle] : [ExamStyle.C2_CONCEPT]);

    setLastConfig({
       files: null,
       config: {
         provider: savedQuiz.provider || 'gemini',
         modelId: savedQuiz.modelId,
         questionCount: 10,
         mode: savedQuiz.mode,
         examStyle: styles, // Safe array
         topic: savedQuiz.topicSummary,
         customPrompt: "" 
       }
    });
    setCurrentView(AppView.GENERATOR);
  };

  const handleStartMixer = (mixedQuestions: Question[]) => {
     // Already handled shuffle/transform in VirtualRoom logic usually, 
     // but safe to ensure options are randomized here too.
     const mixedAndShuffled = shuffleOptions(mixedQuestions);
     
     setQuestions(mixedAndShuffled);
     setOriginalQuestions(mixedAndShuffled);
     setActiveMode(QuizMode.STANDARD);
     setActiveQuizId(null); 
     setErrorMsg(null);
     setResult(null);
     setLastConfig(null);
     setQuizState(QuizState.QUIZ_ACTIVE);
  };
  
  const handleStartMultiplayer = (quizData: Question[], isHostUser: boolean, roomId: string, playerId?: string) => {
    const shuffled = shuffleOptions(quizData);
    setQuestions(shuffled);
    setOriginalQuestions(shuffled);
    setActiveMode(QuizMode.STANDARD);
    setActiveQuizId(null);
    setErrorMsg(null);
    setResult(null);
    setLastConfig(null);
    
    setIsMultiplayer(true);
    setIsHost(isHostUser);
    setMultiplayerRoomId(roomId);
    if (playerId) setMultiplayerPlayerId(playerId);
    
    setQuizState(QuizState.QUIZ_ACTIVE);
  };
  
  // NEW: Remix Handler
  const handleRemix = (sourceQuestions: Question[]) => {
     setLoadingStatus("Remixing Soal...");
     setQuizState(QuizState.PROCESSING);
     
     setTimeout(() => {
        // 1. Transform types (MCQ <-> T/F)
        // 2. Shuffle Options (Position)
        // 3. Shuffle Order
        const mixed = transformToMixed(sourceQuestions);
        const shuffledOptions = shuffleOptions(mixed);
        const finalMix = shuffledOptions.sort(() => Math.random() - 0.5);
        
        setQuestions(finalMix);
        setOriginalQuestions(finalMix); 
        setResult(null);
        setQuizState(QuizState.QUIZ_ACTIVE);
     }, 500);
  };
  
  const handleQuizComplete = async (finalResult: QuizResult) => {
    setResult(finalResult);
    setQuizState(QuizState.RESULTS);
    
    if (activeQuizId) {
       const percentage = Math.round((finalResult.correctCount / finalResult.totalQuestions) * 100);
       updateHistoryStats(activeQuizId, percentage);
    }

    // --- AUTO-SYNC WRONG ANSWERS TO SRS ---
    // Will be implemented with Firebase later
  };

  const handleAnswerSubmit = async (questionIndex: number, selectedOption: any, isCorrect: boolean, scoreDelta: number) => {
    if (isMultiplayer && multiplayerRoomId && multiplayerPlayerId) {
      try {
        // Will be implemented with Firebase later
      } catch (err) {
        console.error("Failed to submit answer to multiplayer room", err);
      }
    }
  };

  const handleExitQuiz = () => { 
    if (isMultiplayer && multiplayerPlayerId) {
      // Will be implemented with Firebase later
    }
    setQuizState(QuizState.CONFIG); 
    setCurrentView(AppView.GENERATOR); 
    resetApp();
  };
  
  const handleDeleteActiveQuiz = async () => { 
      if (activeQuizId) { 
          await deleteQuiz(activeQuizId); 
      } 
      resetApp(); 
  };
  
  const handleRetryMistakes = () => {
    if (!result) return;
    const wrongQuestionIds = result.answers.filter(a => !a.isCorrect).map(a => a.questionId);
    
    // Filter from 'questions' (which might contain repeats with unique IDs)
    const mistakesToRetry = questions.filter(q => wrongQuestionIds.includes(q.id));
    
    // Shuffle options again for retry!
    const reshuffledMistakes = shuffleOptions(mistakesToRetry);
    
    if (reshuffledMistakes.length > 0) { setQuestions(reshuffledMistakes); setResult(null); setQuizState(QuizState.QUIZ_ACTIVE); }
  };

  const handleRetryAll = () => { 
      // Retry the exact same session sequence, BUT reshuffle options so they don't memorize "Answer is A"
      const reshuffledQuestions = shuffleOptions(questions);
      setQuestions(reshuffledQuestions); 
      setResult(null); 
      setQuizState(QuizState.QUIZ_ACTIVE); 
  };

  const handleContinueQuiz = () => { if (questions.length > 0) setQuizState(QuizState.QUIZ_ACTIVE); };

  const handleStartFlashcards = (sourceQuestions: Question[]) => {
     setQuestions(sourceQuestions);
     setOriginalQuestions(sourceQuestions);
     setQuizState(QuizState.FLASHCARDS);
  };

  const renderContent = () => {
    if (quizState === QuizState.PROCESSING) return <LoadingScreen status={loadingStatus} />;
    
    if (quizState === QuizState.QUIZ_ACTIVE) {
        if (!questions || questions.length === 0) {
            setQuizState(QuizState.ERROR);
            setErrorMsg("Data soal kosong atau corrupt.");
            return null;
        }
        
        return (
          <QuizInterface 
            onComplete={handleQuizComplete} 
            onExit={handleExitQuiz}
            onAnswerSubmit={handleAnswerSubmit}
          />
        );
    }

    if (quizState === QuizState.FLASHCARDS) {
        return (
            <FlashcardScreen 
                questions={questions} 
                onClose={handleExitQuiz} 
            />
        );
    }
    
    if (quizState === QuizState.RESULTS && result) {
        if (isMultiplayer && multiplayerRoomId && multiplayerPlayerId) {
            return (
                <MultiplayerLeaderboard 
                    roomId={multiplayerRoomId}
                    currentPlayerId={multiplayerPlayerId}
                    onExit={handleExitQuiz}
                />
            );
        }
        return (
            <ResultScreen 
              result={result} 
              questions={originalQuestions} 
              onReset={resetApp} 
              onExitToDashboard={() => {
                resetApp();
                setCurrentView(AppView.NEURO_SYNC);
              }}
              onRetryMistakes={handleRetryMistakes}
              onRetryAll={handleRetryAll}
              onDelete={activeQuizId ? handleDeleteActiveQuiz : undefined}
              onAddMore={lastConfig ? handleAddMoreQuestions : undefined}
              onRemix={handleRemix} 
            />
        );
    }
    
    if (quizState === QuizState.ERROR) {
      return (
        <div className="text-center mt-20">
           <div className="bg-red-50/50 backdrop-blur-md border border-red-200 p-8 rounded-3xl inline-block max-w-md">
             <h3 className="text-red-800 text-xl font-medium mb-2">Oops!</h3>
             <p className="text-red-600 mb-6">{errorMsg}</p>
             <button onClick={resetApp} className="px-6 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200">Kembali</button>
           </div>
        </div>
      );
    }

    switch (currentView) {
      case AppView.SETTINGS: return <SettingsScreen />;
      case AppView.WORKSPACE: return <HistoryScreen onLoadHistory={handleLoadHistory} onStartFlashcards={handleStartFlashcards} onImportQuiz={handleImportQuiz} />; 
      case AppView.VIRTUAL_ROOM: return <VirtualRoom onStartMix={handleStartMixer} onStartFlashcards={handleStartFlashcards} />;
      case AppView.MULTIPLAYER: return <MultiplayerLobby onStartGame={handleStartMultiplayer} />;
      case AppView.NEURO_SYNC: return <NeuroSyncDashboard keycardId="global" onExit={() => setCurrentView(AppView.GENERATOR)} />;
      case AppView.GENERATOR: default: 
        return (
            <ConfigScreen 
                onStart={startQuizGeneration} 
                onContinue={handleContinueQuiz}
                onStartFlashcards={handleStartFlashcards}
                hasActiveSession={questions.length > 0 && quizState === QuizState.CONFIG && !result}
            />
        );
    }
  };

  return (
    <div className="min-h-[100dvh] p-4 md:p-8 relative pb-24 transition-colors duration-500">
      <div className="fixed top-6 right-6 z-40 flex items-center space-x-3">
        <button 
          onClick={() => setShowAnalysis(!showAnalysis)}
          className="p-2 rounded-full bg-theme-glass border border-theme-border text-theme-muted hover:bg-theme-bg shadow-sm"
        >
          <Info size={24} />
        </button>
      </div>

      <AnimatePresence>
        {showAnalysis && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAnalysis(false)}
          >
            <div className="bg-theme-bg/90 backdrop-blur-xl max-w-lg w-full rounded-3xl p-8 shadow-2xl border border-theme-border" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-theme-text">Mikir ( •_•)</h2>
              <p className="text-sm text-theme-text mb-4">
                Aplikasi ini berjalan 100% di browser kamu. Tidak ada backend server yang menyimpan data pribadimu kecuali kamu menghubungkan Firebase.
              </p>
              <div className="p-4 bg-theme-primary/10 rounded-xl mb-4 border border-theme-primary/20">
                <p className="text-xs text-theme-primary font-medium">Crafted with 🌽 by Bakwan Jagung</p>
              </div>
              <button onClick={() => setShowAnalysis(false)} className="w-full py-2 bg-theme-primary text-white rounded-xl">Tutup</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto pt-8">
        <AnimatePresence mode='wait'>
          <motion.div 
            key={currentView + quizState} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {quizState !== QuizState.PROCESSING && quizState !== QuizState.QUIZ_ACTIVE && (
        <Navigation currentView={currentView} onChangeView={setCurrentView} />
      )}

      <div className="fixed bottom-1 left-0 w-full text-center z-40 pointer-events-none">
        <p className="text-[10px] text-theme-muted opacity-50 font-medium tracking-widest uppercase">
          crafted by Bakwan Jagung 🌽
        </p>
      </div>
    </div>
  );
};

export default App;
