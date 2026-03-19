import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useAutoSave = () => {
  const { activeQuizId, questions, originalQuestions, activeMode, lastConfig } = useAppStore();

  useEffect(() => {
    if (!activeQuizId || questions.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        console.log("Auto-saving quiz to cloud...");
        // TODO: Firebase auto-save
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 5000); // 5 seconds debounce

    return () => clearTimeout(timer);
  }, [questions, originalQuestions, activeQuizId, lastConfig, activeMode]);
};
