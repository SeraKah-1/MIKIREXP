import { useState, useEffect, useRef } from 'react';
import { QuizMode } from '../types';
import { useAppStore } from '../store/useAppStore';

export const useQuizTimer = (
  currentIndex: number,
  isAnswered: boolean,
  handleAnswer: (answerInput: any, isCorrect: boolean) => void
) => {
  const { activeMode: mode } = useAppStore();
  const [timeLeft, setTimeLeft] = useState(20);
  const timeLeftRef = useRef(20);
  const handleAnswerRef = useRef(handleAnswer);

  useEffect(() => {
    handleAnswerRef.current = handleAnswer;
  }, [handleAnswer]);

  useEffect(() => {
    if (mode !== QuizMode.TIME_RUSH || isAnswered) return;

    setTimeLeft(20);
    timeLeftRef.current = 20;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        timeLeftRef.current = next;
        if (next <= 0) {
          clearInterval(interval);
          handleAnswerRef.current(null, false); // Auto-fail
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, mode, isAnswered]);

  return { timeLeft, timeLeftRef, setTimeLeft };
};
