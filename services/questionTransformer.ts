
/**
 * ==========================================
 * QUESTION TRANSFORMER (Client-Side Logic)
 * Mengubah soal MCQ standar menjadi True/False dan Isian
 * tanpa request ke AI lagi.
 * ==========================================
 */

import { Question } from "../types";

export const transformToMixed = (questions: Question[]): Question[] => {
  return questions.map((q, index) => {
    // Pola Distribusi:
    // Index 0: MCQ (Tetap)
    // Index 1: True/False
    // Index 2: Fill Blank
    // ... repeat
    const mode = index % 3;

    if (mode === 1) {
      return convertToTrueFalse(q);
    } else if (mode === 2) {
      return convertToFillBlank(q);
    } else {
      // Pastikan tipe di-set eksplisit
      return { ...q, type: 'MULTIPLE_CHOICE' };
    }
  });
};

// --- NEW: SHUFFLE OPTIONS ---
export const shuffleOptions = (questions: Question[]): Question[] => {
  return questions.map(q => {
    // Hanya acak Multiple Choice. T/F biasanya urutannya tetap (Benar/Salah).
    if (q.type && q.type !== 'MULTIPLE_CHOICE') return q; 

    // Deep copy options agar aman
    const currentOptions = [...q.options];
    const correctAnswerText = currentOptions[q.correctIndex];

    // Fisher-Yates Shuffle
    for (let i = currentOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentOptions[i], currentOptions[j]] = [currentOptions[j], currentOptions[i]];
    }

    // Cari index baru untuk jawaban yang benar
    const newCorrectIndex = currentOptions.indexOf(correctAnswerText);

    return {
        ...q,
        options: currentOptions,
        correctIndex: newCorrectIndex
    };
  });
};

const convertToTrueFalse = (q: Question): Question => {
  // Logic: 
  // 50% peluang kita ambil jawaban BENAR -> Hasil kuis harusnya TRUE
  // 50% peluang kita ambil jawaban SALAH (acak) -> Hasil kuis harusnya FALSE
  
  const isTargetCorrect = Math.random() > 0.5;
  let proposedAnswer = "";
  let correctIndex = 0; // 0 = Benar, 1 = Salah (Standard mapping in UniversalCard)

  if (isTargetCorrect) {
    // Ambil jawaban yang benar
    proposedAnswer = q.options[q.correctIndex];
    correctIndex = 0; // User harus jawab "Benar"
  } else {
    // Ambil jawaban yang salah secara acak
    const wrongOptions = q.options.filter((_, i) => i !== q.correctIndex);
    // Fallback jika tidak ada opsi salah (aneh, tapi just in case)
    proposedAnswer = wrongOptions.length > 0 
      ? wrongOptions[Math.floor(Math.random() * wrongOptions.length)] 
      : "Tidak Ada";
    correctIndex = 1; // User harus jawab "Salah"
  }

  return {
    ...q,
    type: 'TRUE_FALSE',
    // Kita simpan "Tebakan" di field khusus agar UI bisa render: "Apakah jawabannya X?"
    proposedAnswer: proposedAnswer, 
    // Reset options agar tidak bingung (walaupun UniversalCard punya hardcoded options T/F)
    options: ["Benar", "Salah"],
    correctIndex: correctIndex
  };
};

const convertToFillBlank = (q: Question): Question => {
  // Logic:
  // Jawaban benar diambil dari options.
  // Options di-clear agar tidak muncul tombol.
  
  const validAnswer = q.options[q.correctIndex];

  return {
    ...q,
    type: 'FILL_BLANK',
    correctAnswer: validAnswer, // String jawaban untuk dicocokkan
    options: [] // Kosongkan opsi
  };
};
