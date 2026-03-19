import { create } from 'zustand';
import { AppView, QuizState, Question, QuizResult, ModelConfig, QuizMode } from '../types';

interface AppState {
  // App Navigation
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  showAnalysis: boolean;
  setShowAnalysis: (show: boolean) => void;

  // Quiz State
  quizState: QuizState;
  setQuizState: (state: QuizState) => void;
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
  originalQuestions: Question[];
  setOriginalQuestions: (questions: Question[]) => void;
  result: QuizResult | null;
  setResult: (result: QuizResult | null) => void;
  activeQuizId: string | number | null;
  setActiveQuizId: (id: string | number | null) => void;
  lastConfig: { files: File[] | null; config: ModelConfig } | null;
  setLastConfig: (config: { files: File[] | null; config: ModelConfig } | null) => void;
  errorMsg: string | null;
  setErrorMsg: (msg: string | null) => void;
  loadingStatus: string;
  setLoadingStatus: (status: string) => void;
  activeMode: QuizMode;
  setActiveMode: (mode: QuizMode) => void;

  // Multiplayer State
  isMultiplayer: boolean;
  setIsMultiplayer: (isMultiplayer: boolean) => void;
  multiplayerRoomId: string | null;
  setMultiplayerRoomId: (id: string | null) => void;
  multiplayerPlayerId: string | null;
  setMultiplayerPlayerId: (id: string | null) => void;
  isHost: boolean;
  setIsHost: (isHost: boolean) => void;

  // Actions
  resetApp: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial State
  currentView: AppView.GENERATOR,
  showAnalysis: false,

  quizState: QuizState.CONFIG,
  questions: [],
  originalQuestions: [],
  result: null,
  activeQuizId: null,
  lastConfig: null,
  errorMsg: null,
  loadingStatus: "Inisialisasi...",
  activeMode: QuizMode.STANDARD,

  isMultiplayer: false,
  multiplayerRoomId: null,
  multiplayerPlayerId: null,
  isHost: false,

  // Setters
  setCurrentView: (view) => set({ currentView: view }),
  setShowAnalysis: (show) => set({ showAnalysis: show }),

  setQuizState: (state) => set({ quizState: state }),
  setQuestions: (questions) => set({ questions }),
  setOriginalQuestions: (originalQuestions) => set({ originalQuestions }),
  setResult: (result) => set({ result }),
  setActiveQuizId: (id) => set({ activeQuizId: id }),
  setLastConfig: (config) => set({ lastConfig: config }),
  setErrorMsg: (msg) => set({ errorMsg: msg }),
  setLoadingStatus: (status) => set({ loadingStatus: status }),
  setActiveMode: (mode) => set({ activeMode: mode }),

  setIsMultiplayer: (isMultiplayer) => set({ isMultiplayer }),
  setMultiplayerRoomId: (id) => set({ multiplayerRoomId: id }),
  setMultiplayerPlayerId: (id) => set({ multiplayerPlayerId: id }),
  setIsHost: (isHost) => set({ isHost }),

  resetApp: () => set({
    questions: [],
    originalQuestions: [],
    result: null,
    errorMsg: null,
    activeQuizId: null,
    lastConfig: null,
    quizState: QuizState.CONFIG,
    isMultiplayer: false,
    multiplayerRoomId: null,
    multiplayerPlayerId: null,
    isHost: false,
  }),
}));
