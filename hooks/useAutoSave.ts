import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db, auth } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const useAutoSave = () => {
  const { activeQuizId, questions, originalQuestions, activeMode, lastConfig } = useAppStore();

  useEffect(() => {
    if (!activeQuizId || questions.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        console.log("Auto-saving quiz to cloud...");
        if (auth.currentUser) {
          const quizRef = doc(db, "quizzes", String(activeQuizId));
          await updateDoc(quizRef, {
            questions: questions,
            originalQuestions: originalQuestions,
            mode: activeMode,
            lastConfig: lastConfig,
            questionCount: questions.length,
            updatedAt: serverTimestamp()
          });
          console.log("Auto-save successful!");
        }
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 5000); // 5 seconds debounce

    return () => clearTimeout(timer);
  }, [questions, originalQuestions, activeQuizId, lastConfig, activeMode]);
};
