
/**
 * ==========================================
 * GEMINI AI SERVICE (SMART CACHING ARCHITECTURE)
 * ==========================================
 */

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, QuizMode, ExamStyle } from "../types";

// --- CONFIGURATION ---

// Prioritas Model untuk Ingestion (Meringkas). 
const INGESTION_MODELS = [
  'gemini-3-pro-preview',     // 1. Frontier Intelligence
  'gemini-2.5-pro',           // 2. Stable Advanced Thinking
  'gemini-3-flash-preview',   // 3. Balanced Speed
  'gemini-2.5-flash',         // 4. Stable Fast
  'gemini-2.5-flash-lite'     // 5. Ultra Fast Fallback
];

// Model Cepat untuk "Generation" (Membuat Soal) -> High RPM
const DEFAULT_GENERATION_MODEL = 'gemini-3-flash-preview';

const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } } | { text: string }> => {
  // SAFETY: Limit individual file size to 20MB to prevent browser crash and API limits
  if (file.size > 20 * 1024 * 1024) {
    throw new Error(`File ${file.name} terlalu besar (>20MB). Harap gunakan file yang lebih kecil.`);
  }

  return new Promise((resolve, reject) => {
    // Simple text files
    if (file.type === "text/markdown" || file.type === "text/plain" || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({ text: result });
      };
      reader.onerror = (err) => reject(new Error(`Gagal membaca file text ${file.name}`));
      reader.readAsText(file);
    } else {
      // PDF / Images - Use readAsDataURL which is native, async, and much faster/memory-efficient
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the Data-URL prefix (e.g. "data:image/png;base64,") to get raw base64
        const base64Data = result.split(',')[1];
        
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type || 'application/pdf',
          },
        });
      };
      reader.onerror = (err) => {
        console.error("FileReader Error:", err);
        reject(new Error(`Gagal membaca file ${file.name}`));
      };
      reader.readAsDataURL(file);
    }
  });
};

const cleanAndParseJSON = (rawText: string): any[] => {
  if (!rawText) return [];

  console.log("Raw AI Response (First 500 chars):", rawText.substring(0, 500));

  // 1. Remove <thinking> tags (Crucial for Gemini 2.0/3.0 Thinking models)
  let text = rawText;
  if (text && text.includes("<thinking>")) {
    text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
  }

  // 2. Cleanup Markdown blocks
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  // 3. Try Direct Parsing First (Best Case)
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'object') {
      // Check for common wrapper keys
      if (Array.isArray(parsed.questions)) return parsed.questions;
      if (Array.isArray(parsed.data)) return parsed.data;
      if (Array.isArray(parsed.items)) return parsed.items;
      
      // Fallback: return any array found in values
      for (const key in parsed) {
        if (Array.isArray(parsed[key])) return parsed[key];
      }
      
      // Single object case
      if (parsed.text && parsed.options) return [parsed];
    }
  } catch (e) {
    // Continue to heuristic extraction
  }

  // 4. Heuristic Extraction (Find Array)
  const firstOpen = text.indexOf('[');
  const lastClose = text.lastIndexOf(']');

  if (firstOpen !== -1 && lastClose !== -1) {
    const jsonContent = text.substring(firstOpen, lastClose + 1);
    try {
      return JSON.parse(jsonContent);
    } catch (e) {
      // Try fixing common trailing comma issues
      try {
        const fixed = jsonContent.replace(/,\s*]/g, ']');
        return JSON.parse(fixed);
      } catch (e2) {}
    }
  }

  // 5. Heuristic Extraction (Find Object with Array)
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    const jsonContent = text.substring(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(jsonContent);
      if (Array.isArray(parsed.questions)) return parsed.questions;
      for (const key in parsed) {
        if (Array.isArray(parsed[key])) return parsed[key];
      }
    } catch (e) {}
  }

  console.error("Failed to parse JSON. Raw text:", text);
  throw new Error("Gagal memproses data kuis. Format AI tidak valid.");
};

const sanitizeQuestion = (q: any): Omit<Question, 'id'> => {
  let options = Array.isArray(q.options) ? q.options : ["A", "B", "C", "D"];
  options = options.map((o: any) => String(o)).slice(0, 4);
  while (options.length < 4) options.push(`Opsi ${options.length + 1}`);

  let correctIndex = Number(q.correctIndex);
  if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) correctIndex = 0;

  // Note: We do NOT shuffle options here anymore because the AI prompt explicitly designs 
  // Distractors (B, C, D) based on misconceptions. If we shuffle, the "Analysis" in feedback 
  // might mismatch the position.
  // HOWEVER, current app logic relies on `correctIndex`.
  // To keep "Diagnostic Distractors" working, we assume AI output is [Correct, Distractor1, Distractor2, Distractor3]
  // We will shuffle them but update the correctIndex accordingly.
  
  const originalCorrectText = options[correctIndex]; // Usually index 0 from AI prompt instruction
  
  // Fisher-Yates Shuffle
  for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
  }
  
  const newCorrectIndex = options.indexOf(originalCorrectText);

  return {
    text: String(q.text || "Soal Kosong"),
    options: options,
    correctIndex: newCorrectIndex,
    explanation: String(q.explanation || "Pembahasan tidak tersedia."),
    hint: String(q.hint || "Coba ingat kembali konsep utamanya."),
    keyPoint: String(q.keyPoint || "Umum").substring(0, 50), // Increased limit
    difficulty: "Medium"
  };
};

/**
 * SMART INGESTION (SIMPLIFIED)
 * Menggunakan satu model cepat (Flash) untuk meringkas materi.
 * Tidak ada looping model lain agar cepat dan hemat kuota.
 */
export const summarizeMaterial = async (apiKey: string, content: string | File): Promise<string> => {
  if (!content) return "";
  
  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-3-flash-preview'; // Standard Fast Model
  
  const prompt = `
    ROLE: Senior Knowledge Engineer.
    TASK: Process the provided raw document into a "High-Density Knowledge Summary" optimized for future RAG.
    
    INSTRUCTIONS:
    1. READ the entire raw text or document.
    2. EXTRACT every single definition, date, formula, key figure, and cause-effect relationship.
    3. DISCARD fluff, introductions, filler words, and repetitive examples.
    4. FORMAT the output as a structured list of facts and concepts.
    5. LANGUAGE RULE: You MUST write the entire summary STRICTLY in Bahasa Indonesia. Do NOT mix with English unless it is a specific technical term.
  `;

  try {
      console.log(`[Smart Ingest] Summarizing with ${modelName}...`);
      
      const parts: any[] = [];
      if (typeof content === 'string') {
        parts.push({ text: prompt + `\n\nRAW TEXT:\n"${content.substring(0, 500000)}"` });
      } else {
        const filePart = await fileToGenerativePart(content);
        parts.push(filePart);
        parts.push({ text: prompt });
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts }
      });
      
      const result = response.text;
      if (!result) return typeof content === 'string' ? content.substring(0, 10000) : "Gagal mengekstrak PDF."; // Fallback to raw if empty
      
      return `[SUMMARY]\n${result}`;
  } catch (e: any) {
      console.warn(`[Smart Ingest] Failed:`, e.message);
      return typeof content === 'string' ? content.substring(0, 10000) : "Gagal mengekstrak PDF."; // Fallback to raw on error
  }
};

/**
 * QUIZ GENERATION (DIRECT MODE)
 * Tanpa "Subsidi" (Fallback Model). Model yang dipilih adalah model yang dieksekusi.
 */
export const generateQuiz = async (
  apiKey: string, 
  files: File[] | File | null, 
  topic: string | undefined, 
  modelId: string, // User selected model
  questionCount: number,
  mode: QuizMode,
  examStyles: ExamStyle[] = [ExamStyle.C2_CONCEPT],
  onProgress: (status: string) => void,
  existingQuestionsContext: string[] = [],
  customPrompt: string = "",
  libraryContext: string = "" 
): Promise<{ questions: Question[], contextText: string }> => {
  
  if (!apiKey) throw new Error("API Key Gemini belum diatur.");
  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  // --- PREPARE CONTEXT ---
  const baseParts: any[] = [];
  let contextText = ""; 

  // 1. Handle Library Context
  if (libraryContext) {
     onProgress("Memuat Context...");
     baseParts.push({ text: `LIBRARY MATERIAL:\n${libraryContext}\n\nEND OF LIBRARY MATERIAL` }); 
     contextText = "[Library Source]";
  }

  // 2. Handle File Uploads
  const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
  if (fileArray.length > 0) {
    for (const file of fileArray) {
      onProgress(`Memproses file ${file.name}...`);
      const part = await fileToGenerativePart(file);
      baseParts.push(part);
    }
    contextText += ` [Files: ${fileArray.map(f => f.name).join(', ')}]`; 
  } 
  
  // 3. Topic Focus
  if (topic) {
    baseParts.push({ text: `IMPORTANT: FOCUS ONLY ON THIS TOPIC: "${topic}".` });
    if (!contextText) contextText = topic;
  }

  // --- BLOOM'S TAXONOMY PROMPT BUILDER ---
  const getBloomPrompt = (styles: ExamStyle[]) => {
    if (styles.length === 0) return `COGNITIVE LEVEL: ${ExamStyle.C2_CONCEPT}`;
    
    let instructions = "COGNITIVE LEVELS (Mix these types based on user selection):\n";
    if (styles.includes(ExamStyle.C1_RECALL)) {
      instructions += "- C1 (Recall): Test basic facts, definitions, and dates. (e.g., 'What is...', 'Who defined...')\n";
    }
    if (styles.includes(ExamStyle.C2_CONCEPT)) {
      instructions += "- C2 (Understand): Test comprehension of concepts. Ask to summarize, classify, or explain in own words.\n";
    }
    if (styles.includes(ExamStyle.C3_APPLICATION)) {
      instructions += "- C3 (Apply): Provide a short scenario or case study. Ask the user to apply a formula, rule, or concept to solve it.\n";
    }
    if (styles.includes(ExamStyle.C4_ANALYSIS)) {
      instructions += "- C4 (Analyze): Ask the user to identify causes, compare/contrast two concepts, or find logical flaws in a statement.\n";
    }
    if (styles.includes(ExamStyle.C5_EVALUATION)) {
      instructions += "- C5 (Evaluate): Present a complex situation or argument. Ask the user to judge its validity, critique it, or choose the best course of action with justification.\n";
    }
    return instructions;
  };

  const bloomInstruction = getBloomPrompt(examStyles);

  const modeInstruction = "";

  // --- BATCHING STRATEGY (SEQUENTIAL FOR ANTI-REPETITION) ---
  const BATCH_SIZE = 10; 
  const totalBatches = Math.ceil(questionCount / BATCH_SIZE);
  let allGeneratedQuestions: Question[] = [];

  // Gunakan model yang dipilih user. Jika kosong, default ke Flash.
  const selectedModel = modelId || 'gemini-3-flash-preview';
  
  // Define Schema
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            hint: { type: Type.STRING },
            keyPoint: { type: Type.STRING },
          },
          required: ["text", "options", "correctIndex", "explanation", "hint", "keyPoint"],
        },
      },
    },
    required: ["questions"],
  };

  // Helper function to generate a batch
  const generateBatch = async (batchIndex: number, count: number, previousQuestions: Question[]): Promise<Question[]> => {
      // Anti-repetition logic
      let avoidancePrompt = "";
      const allContext = [...existingQuestionsContext, ...previousQuestions.map(q => q.text)];
      if (allContext.length > 0) {
          const prevTopics = allContext.map(q => q.substring(0, 30)).slice(-30).join(" | ");
          avoidancePrompt = `CRITICAL: DO NOT repeat or rephrase these existing questions/topics: [${prevTopics}]. Ensure completely new angles or concepts are tested.`;
      }

      const batchPrompt = `
        ROLE: Expert Tutor.
        GOAL: Create ${count} multiple-choice questions for: "${topic || 'Context'}".
        
        ${bloomInstruction}
        ${modeInstruction}
        USER NOTE: "${customPrompt}"
    
        INSTRUCTIONS:
        1. GENERATE EXACTLY ${count} JSON objects.
        2. USE provided Knowledge Base.
        3. STRUCTURE:
           - Option A: Correct.
           - Option B, C, D: Distractors.
        4. FEEDBACK: Explain why the answer is correct and why others are wrong.
        5. HINT: Socratic hint.
        6. LANGUAGE RULE: You MUST write the entire quiz (questions, options, explanations, hints) STRICTLY in Bahasa Indonesia. Do NOT mix with English unless it is a specific technical term.
    
        OUTPUT JSON format only.
        ${avoidancePrompt}
        (Batch ${batchIndex + 1}/${totalBatches})
      `;

      const parts = [...baseParts, { text: batchPrompt }];

      try {
         const response = await ai.models.generateContent({
            model: selectedModel,
            contents: { parts },
            config: { 
              responseMimeType: "application/json", 
              responseSchema: responseSchema, 
              temperature: 0.5, // Slightly higher temperature for more variety
            }
         });

         const responseText = response.text;
         if (!responseText) throw new Error("Empty Response");

         const rawQuestions = cleanAndParseJSON(responseText);
         if (!Array.isArray(rawQuestions)) throw new Error("Format AI salah.");
         
         const validQuestions = rawQuestions.filter(q => q.text && q.options && q.options.length > 1);
         return validQuestions.map(sanitizeQuestion) as any[];

      } catch (err: any) {
         console.error(`Batch ${batchIndex} Error (${selectedModel}):`, err.message);
         return []; 
      }
  };

  // --- EXECUTE SEQUENTIAL BATCHES ---
  try {
      for (let i = 0; i < totalBatches; i++) {
          const countForBatch = Math.min(BATCH_SIZE, questionCount - (i * BATCH_SIZE));
          onProgress(`Menyusun soal ${allGeneratedQuestions.length + 1} - ${allGeneratedQuestions.length + countForBatch} dari ${questionCount}...`);
          
          const batchResults = await generateBatch(i, countForBatch, allGeneratedQuestions);
          allGeneratedQuestions = [...allGeneratedQuestions, ...batchResults];
          
          // Small delay to avoid rate limits
          if (i < totalBatches - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
          }
      }

      if (allGeneratedQuestions.length < 1) {
         throw new Error(`Gagal generate soal dengan model ${selectedModel}. Coba ganti model atau kurangi materi.`);
      }

      // Client-side deduplication (Safety Net)
      const uniqueQuestions: Question[] = [];
      const seenTexts = new Set<string>();
      
      for (const q of allGeneratedQuestions) {
          // Simple similarity check: first 20 chars
          const simplifiedText = q.text.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
          if (!seenTexts.has(simplifiedText)) {
              seenTexts.add(simplifiedText);
              uniqueQuestions.push(q);
          }
      }

      const finalQuestions = uniqueQuestions.map((q, index) => ({
        ...q,
        id: index + 1
      }));

      return { questions: finalQuestions, contextText };

  } catch (err: any) {
      console.error("Gemini Fatal Error:", err);
      throw err;
  }
};

export const chatWithDocument = async (apiKey: string, modelId: string, history: any[], message: string, contextText: string, file: File | null) => {
  if (!apiKey) throw new Error("API Key Gemini belum diatur.");
  const ai = new GoogleGenAI({ apiKey: apiKey });

  const finalParts: any[] = [];

  const systemInstruction = `
    ROLE: Expert Tutor and Assistant.
    TASK: Answer the user's question based ONLY on the provided CONTEXT MATERIAL or FILE.
    If the answer is not in the context, politely inform the user that the information is not available in the provided material.
    Be concise, helpful, and use markdown for formatting.
    LANGUAGE RULE: You MUST write your response STRICTLY in Bahasa Indonesia. Do NOT mix with English unless it is a specific technical term.
  `;

  let promptText = `${systemInstruction}\n\n`;

  if (contextText) {
    promptText += `CONTEXT MATERIAL:\n${contextText}\n\nEND OF CONTEXT MATERIAL\n\n`;
  }

  if (file) {
    const filePart = await fileToGenerativePart(file);
    finalParts.push(filePart);
  }

  promptText += `USER MESSAGE: ${message}\n\n`;

  const formattedHistory = history.map(h => {
    return `${h.role === 'user' ? 'USER' : 'ASSISTANT'}: ${h.parts[0].text}`;
  }).join('\n\n');

  promptText += `CHAT HISTORY:\n${formattedHistory}\n\nASSISTANT:\n`;

  finalParts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: modelId || 'gemini-3-flash-preview',
      contents: { parts: finalParts },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      }
    });

    return response.text || "Maaf, saya tidak bisa memberikan jawaban saat ini.";
  } catch (err: any) {
    console.error("Chat Error:", err);
    throw new Error("Gagal memproses pesan. Periksa koneksi atau API Key.");
  }
};
