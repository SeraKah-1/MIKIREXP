
import { expect, test, describe } from "bun:test";
import { shuffleOptions } from "./questionTransformer";
import { Question } from "../types";

describe("shuffleOptions", () => {
  const mockQuestions: Question[] = [
    {
      id: 1,
      type: 'MULTIPLE_CHOICE',
      text: "What is 1+1?",
      options: ["1", "2", "3", "4"],
      correctIndex: 1, // "2"
      explanation: "Basic math",
      keyPoint: "addition",
      difficulty: 'Easy'
    },
    {
      id: 2,
      type: 'TRUE_FALSE',
      text: "The sky is blue.",
      options: ["Benar", "Salah"],
      correctIndex: 0,
      explanation: "Physics",
      keyPoint: "nature",
      difficulty: 'Easy'
    }
  ];

  test("should shuffle MULTIPLE_CHOICE options while maintaining all options", () => {
    const questions: Question[] = [mockQuestions[0]];
    const shuffled = shuffleOptions(questions);

    expect(shuffled[0].options).toHaveLength(4);
    expect(shuffled[0].options).toContain("1");
    expect(shuffled[0].options).toContain("2");
    expect(shuffled[0].options).toContain("3");
    expect(shuffled[0].options).toContain("4");
  });

  test("should update correctIndex to point to the same correct answer text", () => {
    const questions: Question[] = [mockQuestions[0]];
    const correctText = questions[0].options[questions[0].correctIndex]; // "2"

    const shuffled = shuffleOptions(questions);
    const newCorrectText = shuffled[0].options[shuffled[0].correctIndex];

    expect(newCorrectText).toBe(correctText);
  });

  test("should NOT shuffle TRUE_FALSE questions", () => {
    const questions: Question[] = [mockQuestions[1]];
    const shuffled = shuffleOptions(questions);

    expect(shuffled[0]).toEqual(questions[0]);
    expect(shuffled[0].options).toEqual(["Benar", "Salah"]);
  });

  test("should handle missing type and default to MCQ behavior", () => {
    const questions: Question[] = [
      {
        id: 3,
        text: "Implicit MCQ",
        options: ["A", "B", "C"],
        correctIndex: 2, // "C"
        explanation: "Test",
        keyPoint: "test",
        difficulty: 'Easy'
      }
    ];

    const shuffled = shuffleOptions(questions);
    expect(shuffled[0].options[shuffled[0].correctIndex]).toBe("C");
    expect(shuffled[0].options).toHaveLength(3);
  });

  test("should NOT mutate the original input array or objects", () => {
    const originalQuestions = JSON.parse(JSON.stringify(mockQuestions));
    shuffleOptions(mockQuestions);

    expect(mockQuestions).toEqual(originalQuestions);
  });

  test("should return a new array and new question objects", () => {
    const shuffled = shuffleOptions(mockQuestions);

    expect(shuffled).not.toBe(mockQuestions);
    expect(shuffled[0]).not.toBe(mockQuestions[0]);
  });

  test("should handle empty options array gracefully", () => {
    const questions: Question[] = [
      {
        id: 4,
        type: 'MULTIPLE_CHOICE',
        text: "No options",
        options: [],
        correctIndex: -1,
        explanation: "Test",
        keyPoint: "test",
        difficulty: 'Easy'
      }
    ];

    const shuffled = shuffleOptions(questions);
    expect(shuffled[0].options).toEqual([]);
    expect(shuffled[0].correctIndex).toBe(-1);
  });
});
