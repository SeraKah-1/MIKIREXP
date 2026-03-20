
export type { ThemeName } from './services/themeService';

export enum QuizState {
  CONFIG = 'CONFIG',
  PROCESSING = 'PROCESSING',
  QUIZ_ACTIVE = 'QUIZ_ACTIVE',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR',
  CHALLENGE_LANDING = 'CHALLENGE_LANDING',
  FLASHCARDS = 'FLASHCARDS'
}

export enum AppView {
  GENERATOR = 'GENERATOR',
  WORKSPACE = 'WORKSPACE', 
  SETTINGS = 'SETTINGS',
  VIRTUAL_ROOM = 'VIRTUAL_ROOM',
  MULTIPLAYER = 'MULTIPLAYER',
  NEURO_SYNC = 'NEURO_SYNC'
}

export enum QuizMode {
  STANDARD = 'STANDARD',
  SCAFFOLDING = 'SCAFFOLDING', 
  SURVIVAL = 'SURVIVAL',
  TIME_RUSH = 'TIME_RUSH', // New Mode
  CHALLENGE = 'CHALLENGE'
}

// Updated to Bloom's Taxonomy
export enum ExamStyle {
  C1_RECALL = 'C1_RECALL',         // Mengingat (Hafalan)
  C2_CONCEPT = 'C2_CONCEPT',       // Memahami (Konsep Dasar)
  C3_APPLICATION = 'C3_APPLICATION', // Menerapkan (Studi Kasus)
  C4_ANALYSIS = 'C4_ANALYSIS',     // Menganalisis (Diagnosa/Logika)
  C5_EVALUATION = 'C5_EVALUATION'  // Mengevaluasi (Kritik/Bandingkan)
}

// --- NEW QUESTION TYPES ---
export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_BLANK';

export interface Question {
  id: number;
  type?: QuestionType; // Defaults to MULTIPLE_CHOICE
  text: string;
  options: string[]; 
  correctIndex: number; 
  correctAnswer?: string; // For FillBlank (String matching)
  proposedAnswer?: string; // NEW: For True/False (e.g. "Apakah ibukota Jabar adalah [Surabaya]?")
  explanation: string;
  hint?: string; // NEW: Socratic hint
  keyPoint: string; 
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isReview?: boolean;
  originalId?: number;
}

export interface SRSItem {
  id?: string;
  keycard_id?: string;
  item_id: string;
  item_type: 'quiz_question' | 'note' | 'library';
  content: any; // The actual question object or note content
  easiness: number;
  interval: number;
  repetition: number;
  next_review: string; // ISO string
  created_at?: string;
  updated_at?: string;
}

export interface QuizResult {
  correctCount: number;
  totalQuestions: number;
  score: number;
  mode: QuizMode;
  answers: { questionId: number; selectedIndex: number; textAnswer?: string; isCorrect: boolean }[];
  challengeId?: string; // Link to challenge if applicable
}

export interface ChallengeData {
  id: string;
  creatorName: string;
  topic: string;
  questions: Question[];
  creatorScore: number;
  challengerName?: string;
  challengerScore?: number;
  created_at: string;
}

export interface SkillAnalysis {
  memory: number; 
  logic: number;
  focus: number;
  application: number;
  analysis: string; 
}

export interface LibraryItem {
  id: string | number;
  title: string;
  content: string; 
  processedContent?: string; // NEW: Cached summary/notes from AI
  type: 'pdf' | 'text' | 'note';
  tags: string[];
  created_at: string;
}

export interface CloudNote {
  id: string | number; 
  title: string;       
  content: string;
  created_at: string;  
  tags?: string[];     
}

export type AiProvider = 'gemini';

export type StorageProvider = 'local' | 'firebase';

export type QuizVisibility = 'public' | 'private' | 'unlisted';

export interface KeycardData {
  version: string;
  id?: string;
  metadata: {
    owner: string;
    created_at: number;
    expires_at?: number;
    valid_domain?: string;
  };
  config: {
    geminiKey?: string; 
    geminiKeys?: string[]; 
    preferredProvider?: AiProvider;
    customPrompt?: string; 
  };
}

export interface ModelConfig {
  provider: AiProvider;
  modelId: string;
  questionCount: number;
  mode: QuizMode;
  examStyle: ExamStyle[]; // CHANGED: Now an array for multi-select
  topic?: string; 
  customPrompt?: string; 
  libraryContext?: string;
  enableRetention?: boolean;
  enableMixedTypes?: boolean; // New: Toggle for True/False & FillBlank
  stickyMode?: boolean; // New: Allow repetitive questions
  folder?: string;
  visibility?: QuizVisibility;
  accessCode?: string;
}

export interface ModelOption {
  id: string;
  label: string;
  provider: AiProvider;
  isVision?: boolean; 
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // --- GEMINI FLASH (Fast & Efficient) ---
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)", provider: 'gemini', isVision: false },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Fastest & Latest)", provider: 'gemini', isVision: true },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Balanced)", provider: 'gemini', isVision: true },
  { id: "gemini-2.0-flash-lite-preview-02-05", label: "Gemini 2.0 Flash-Lite (Experimental)", provider: 'gemini', isVision: true },

  // --- GEMINI PRO (High Intelligence) ---
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Advanced Reasoning)", provider: 'gemini', isVision: true },
];
