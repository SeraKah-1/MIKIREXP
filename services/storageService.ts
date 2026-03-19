/**
 * ==========================================
 * STORAGE SERVICE (Facade)
 * ==========================================
 * Mengatur LocalStorage dan IndexedDB (untuk data besar).
 */

import { Question, ModelConfig, AiProvider, StorageProvider, CloudNote, LibraryItem } from "../types";
import { summarizeMaterial } from "./geminiService";
import { get, set, update } from 'idb-keyval'; // IndexedDB Wrapper
import { db, auth } from "../firebase";
import { 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    collection, 
    getDocs, 
    query, 
    where, 
    deleteDoc,
    serverTimestamp,
    Timestamp,
    onSnapshot,
    orderBy,
    limit
} from "firebase/firestore";

export enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
    const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            emailVerified: auth.currentUser?.emailVerified,
            isAnonymous: auth.currentUser?.isAnonymous,
            providerInfo: auth.currentUser?.providerData.map(provider => ({
                providerId: provider.providerId,
                displayName: provider.displayName,
                email: provider.email,
                photoUrl: provider.photoURL
            })) || []
        },
        operationType,
        path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
}

// Helper for Unique IDs
export const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try {
            return crypto.randomUUID();
        } catch (e) {
            // Fallback if randomUUID fails (e.g. insecure context)
        }
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const HISTORY_KEY = 'glassquiz_history'; // Legacy key for migration
const HISTORY_IDB_KEY = 'glassquiz_history_store'; // Key for IndexedDB
const LIBRARY_IDB_KEY = 'glassquiz_library_store'; // Key for IndexedDB
const GRAVEYARD_KEY = 'glassquiz_graveyard'; 
const GEMINI_KEY_STORAGE = 'glassquiz_api_key';
const STORAGE_PREF_KEY = 'glassquiz_storage_pref';
const GESTURE_ENABLED_KEY = 'glassquiz_gesture_enabled';
const EYE_TRACKING_ENABLED_KEY = 'glassquiz_eye_tracking_enabled';

// --- SETTINGS (GESTURE, EYE TRACKING, THEME, SRS) ---
export const saveGestureEnabled = async (enabled: boolean) => {
    localStorage.setItem(GESTURE_ENABLED_KEY, JSON.stringify(enabled));
    if (auth.currentUser) {
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await setDoc(userRef, { config: { gestureEnabled: enabled } }, { merge: true });
        } catch (e) { console.error("Cloud Sync failed:", e); }
    }
};

export const getGestureEnabled = (): boolean => {
    const raw = localStorage.getItem(GESTURE_ENABLED_KEY);
    return raw ? JSON.parse(raw) : false; 
};

export const saveEyeTrackingEnabled = async (enabled: boolean) => {
    localStorage.setItem(EYE_TRACKING_ENABLED_KEY, JSON.stringify(enabled));
    if (auth.currentUser) {
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await setDoc(userRef, { config: { eyeTrackingEnabled: enabled } }, { merge: true });
        } catch (e) { console.error("Cloud Sync failed:", e); }
    }
};

export const getEyeTrackingEnabled = (): boolean => {
    const raw = localStorage.getItem(EYE_TRACKING_ENABLED_KEY);
    return raw ? JSON.parse(raw) : false; 
};

const THEME_KEY = 'glassquiz_theme';
export const saveTheme = async (theme: 'light' | 'dark' | 'glass') => {
    localStorage.setItem(THEME_KEY, theme);
    if (auth.currentUser) {
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await setDoc(userRef, { config: { theme } }, { merge: true });
        } catch (e) { console.error("Cloud Sync failed:", e); }
    }
};

export const getTheme = (): string => {
    return localStorage.getItem(THEME_KEY) || 'glass';
};

const SRS_ENABLED_KEY = 'neuro_srs_enabled';
export const saveSRSEnabled = async (enabled: boolean) => {
    localStorage.setItem(SRS_ENABLED_KEY, String(enabled));
    if (auth.currentUser) {
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await setDoc(userRef, { config: { srsEnabled: enabled } }, { merge: true });
        } catch (e) { console.error("Cloud Sync failed:", e); }
    }
};

export const getSRSEnabled = (): boolean => {
    return localStorage.getItem(SRS_ENABLED_KEY) !== 'false';
};

// --- MISTAKE GRAVEYARD ---
export const addToGraveyard = async (question: Question) => {
  try {
    const raw = localStorage.getItem(GRAVEYARD_KEY);
    let graveyard = raw ? JSON.parse(raw) : [];
    const exists = graveyard.find((q: Question) => q.text === question.text);
    
    if (!exists) {
      const newItem = { ...question, id: generateId(), buriedAt: Date.now() };
      graveyard.unshift(newItem);
      localStorage.setItem(GRAVEYARD_KEY, JSON.stringify(graveyard));

      // Cloud Sync
      if (auth.currentUser) {
          const itemRef = doc(db, "users", auth.currentUser.uid, "graveyard", newItem.id);
          await setDoc(itemRef, newItem);
      }
    }
  } catch (e) { console.error("Gagal mengubur soal:", e); }
};

export const getGraveyard = async (): Promise<any[]> => {
  try {
    const raw = localStorage.getItem(GRAVEYARD_KEY);
    let localGraveyard = raw ? JSON.parse(raw) : [];

    // Cloud Sync
    if (auth.currentUser) {
        try {
            const graveyardRef = collection(db, "users", auth.currentUser.uid, "graveyard");
            const q = query(graveyardRef);
            const querySnapshot = await getDocs(q);
            const cloudGraveyard: any[] = [];
            querySnapshot.forEach((doc) => {
                cloudGraveyard.push({ ...doc.data(), id: doc.id });
            });

            if (cloudGraveyard.length > 0) {
                // Merge logic
                const merged = [...cloudGraveyard];
                localGraveyard.forEach((local: any) => {
                    if (!merged.find(m => m.text === local.text)) {
                        merged.push(local);
                    }
                });
                localGraveyard = merged;
                localStorage.setItem(GRAVEYARD_KEY, JSON.stringify(localGraveyard));
            }
        } catch (e) { console.error("Cloud Graveyard Fetch failed", e); }
    }

    return localGraveyard;
  } catch (e) { return []; }
};

export const removeFromGraveyard = async (text: string) => {
  try {
    const raw = localStorage.getItem(GRAVEYARD_KEY);
    if (raw) {
      const graveyard = JSON.parse(raw);
      const itemToDelete = graveyard.find((q: any) => q.text === text);
      const newGraveyard = graveyard.filter((q: any) => q.text !== text);
      localStorage.setItem(GRAVEYARD_KEY, JSON.stringify(newGraveyard));

      // Cloud Sync
      if (auth.currentUser && itemToDelete?.id) {
          const itemRef = doc(db, "users", auth.currentUser.uid, "graveyard", itemToDelete.id);
          await deleteDoc(itemRef);
      }
    }
  } catch (e) { console.error("Gagal membangkitkan soal", e); }
};

// --- GLOBAL SYNC ---
export const syncAllFromCloud = async () => {
    if (!auth.currentUser) return;

    console.log("Starting full cloud synchronization...");
    
    // 1. Sync Config
    try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            const config = userDoc.data().config;
            if (config) {
                if (config.geminiApiKey) localStorage.setItem(GEMINI_KEY_STORAGE, config.geminiApiKey);
                if (config.theme) localStorage.setItem(THEME_KEY, config.theme);
                if (config.srsEnabled !== undefined) localStorage.setItem(SRS_ENABLED_KEY, String(config.srsEnabled));
                if (config.gestureEnabled !== undefined) localStorage.setItem(GESTURE_ENABLED_KEY, JSON.stringify(config.gestureEnabled));
                if (config.eyeTrackingEnabled !== undefined) localStorage.setItem(EYE_TRACKING_ENABLED_KEY, JSON.stringify(config.eyeTrackingEnabled));
                if (config.storageProvider) localStorage.setItem(STORAGE_PREF_KEY, config.storageProvider);
            }
        }
    } catch (e) { console.error("Config sync failed", e); }

    // 2. Sync Library
    await getLibraryItems();

    // 3. Sync Quizzes
    await getSavedQuizzes();

    // 4. Sync Graveyard
    await getGraveyard();

    console.log("Cloud synchronization complete.");
};

// --- API KEY MANAGEMENT ---
export const saveApiKey = async (provider: AiProvider, key: string) => {
  if (provider === 'gemini') {
    localStorage.setItem(GEMINI_KEY_STORAGE, key);
    
    // Cloud Sync
    if (auth.currentUser) {
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await setDoc(userRef, {
                config: { geminiApiKey: key }
            }, { merge: true });
        } catch (e) {
            console.error("Gagal sinkronisasi API Key ke cloud:", e);
        }
    }
  }
};

export const getApiKey = (provider: AiProvider = 'gemini'): string | null => {
  let storedKey = null;
  if (provider === 'gemini') storedKey = localStorage.getItem(GEMINI_KEY_STORAGE);

  if (storedKey) return storedKey;

  // Fallback to Environment Variables (.env)
  if (provider === 'gemini') {
      if (typeof process !== 'undefined' && process.env) {
          if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
          if (process.env.API_KEY) return process.env.API_KEY;
      }
      if (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
          return import.meta.env.VITE_GEMINI_API_KEY;
      }
  } 

  return null;
};

export const syncApiKeyFromCloud = async () => {
    if (!auth.currentUser) return;
    try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            const config = userDoc.data().config;
            if (config?.geminiApiKey) {
                localStorage.setItem(GEMINI_KEY_STORAGE, config.geminiApiKey);
                return config.geminiApiKey;
            }
        }
    } catch (e) {
        console.error("Gagal sinkronisasi API Key dari cloud:", e);
    }
    return null;
};

export const removeApiKey = async (provider: AiProvider) => {
  if (provider === 'gemini') {
     localStorage.removeItem(GEMINI_KEY_STORAGE);
     
     if (auth.currentUser) {
         try {
             const userRef = doc(db, "users", auth.currentUser.uid);
             await setDoc(userRef, {
                 config: { geminiApiKey: null }
             }, { merge: true });
         } catch (e) {
             console.error("Gagal menghapus API Key dari cloud:", e);
         }
     }
  }
};

// --- STORAGE CONFIGURATION ---
export const saveStorageConfig = (provider: StorageProvider) => {
  localStorage.setItem(STORAGE_PREF_KEY, provider);
};

export const getStorageProvider = (): StorageProvider => {
  return (localStorage.getItem(STORAGE_PREF_KEY) as StorageProvider) || 'local';
};

// --- LIBRARY MANAGEMENT (Smart Ingest Implementation) ---

export const processAndSaveToLibrary = async (title: string, rawContent: string | File, type: 'pdf' | 'text' | 'note') => {
    let processed = "";
    
    // Try to summarize using Gemini if Key is available
    const geminiKey = getApiKey('gemini');
    
    if (geminiKey) {
        try {
            // Only use heavy model if content justifies it (> 500 chars) or if it's a file
            if (typeof rawContent !== 'string' || rawContent.length > 500) {
                processed = await summarizeMaterial(geminiKey, rawContent);
            } else {
                processed = rawContent;
            }
        } catch (e) {
            console.warn("Auto-ingest failed, falling back to raw content", e);
            processed = typeof rawContent === 'string' ? rawContent : "Gagal memproses file.";
        }
    } else {
        processed = typeof rawContent === 'string' ? rawContent : "Gagal memproses file. API Key tidak ada."; // Fallback if no key
    }

    const finalRawContent = typeof rawContent === 'string' ? rawContent : `[File: ${rawContent.name}]\n\n` + processed;
    await saveToLibrary(title, finalRawContent, processed, type);
};

// Helper to re-process an existing item (e.g. triggered manually)
export const reprocessLibraryItem = async (item: LibraryItem): Promise<boolean> => {
    const geminiKey = getApiKey('gemini');
    if (!geminiKey) return false;

    try {
        const processed = await summarizeMaterial(geminiKey, item.content);
        await updateLibraryItem(item.id, { processedContent: processed });
        return true;
    } catch (e) {
        console.error("Reprocess failed", e);
        return false;
    }
};

export const updateLibraryItem = async (id: string | number, updates: Partial<LibraryItem>) => {
    // 1. Update Local (IndexedDB)
    try {
        await update(LIBRARY_IDB_KEY, (val) => {
            const library = val || [];
            return library.map((item: LibraryItem) => 
                String(item.id) === String(id) ? { ...item, ...updates } : item
            );
        });
    } catch(e) { console.error("IDB Update failed", e); }

    // 2. Update Cloud
    if (auth.currentUser) {
        try {
            const itemRef = doc(db, "users", auth.currentUser.uid, "library", String(id));
            await updateDoc(itemRef, updates);
        } catch (e) {
            console.error("Cloud Library Update failed", e);
        }
    }
};

export const saveToLibrary = async (title: string, content: string, processedContent: string, type: 'pdf' | 'text' | 'note', tags: string[] = []) => {
  const newItem: LibraryItem = {
    id: generateId(),
    title,
    content, // Original Raw Text
    processedContent, // AI Summarized Text (Lightweight)
    type,
    tags,
    created_at: new Date().toISOString()
  };

  try {
    // 1. IndexedDB (Primary Local Storage)
    await update(LIBRARY_IDB_KEY, (val) => {
        const library = val || [];
        return [newItem, ...library];
    });

    // 2. Cloud Sync
    if (auth.currentUser) {
        const itemRef = doc(db, "users", auth.currentUser.uid, "library", String(newItem.id));
        await setDoc(itemRef, {
            ...newItem,
            userId: auth.currentUser.uid,
            created_at: serverTimestamp() // Use server timestamp for cloud
        });
    }
  } catch (err) {
    console.error("Library Save Error:", err);
    alert("Gagal menyimpan materi. Cek memori browser.");
  }
};

export const getLibraryItems = async (): Promise<LibraryItem[]> => {
  let localItems: LibraryItem[] = [];

  // 1. Get Local (IndexedDB)
  try {
    localItems = (await get(LIBRARY_IDB_KEY)) || [];
  } catch (e) { 
      // Fallback for migration: try localstorage once
      const rawLib = localStorage.getItem('glassquiz_library');
      if (rawLib) {
          localItems = JSON.parse(rawLib);
          // Migrate to IDB
          await set(LIBRARY_IDB_KEY, localItems);
          localStorage.removeItem('glassquiz_library');
      }
  }

  // 2. Cloud Sync (Merge)
  if (auth.currentUser) {
      try {
          const libraryRef = collection(db, "users", auth.currentUser.uid, "library");
          const q = query(libraryRef);
          const querySnapshot = await getDocs(q);
          const cloudItems: LibraryItem[] = [];
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              cloudItems.push({
                  ...data,
                  id: doc.id,
                  created_at: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : data.created_at
              } as LibraryItem);
          });

          // Merge logic: Cloud items take precedence or we just combine and deduplicate
          // For simplicity, let's update local with cloud data if local is empty or older
          if (cloudItems.length > 0) {
              // Deduplicate by ID
              const merged = [...cloudItems];
              localItems.forEach(local => {
                  if (!merged.find(m => String(m.id) === String(local.id))) {
                      merged.push(local);
                  }
              });
              localItems = merged;
              await set(LIBRARY_IDB_KEY, localItems);
          }
      } catch (e) {
          console.error("Cloud Library Fetch failed", e);
      }
  }

  return localItems.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

export const deleteLibraryItem = async (id: string | number) => {
  // 1. Delete from IDB
  await update(LIBRARY_IDB_KEY, (val) => {
      const library = val || [];
      return library.filter((item: LibraryItem) => String(item.id) !== String(id));
  });

  // 2. Delete from Cloud
  if (auth.currentUser) {
      try {
          const itemRef = doc(db, "users", auth.currentUser.uid, "library", String(id));
          await deleteDoc(itemRef);
      } catch (e) {
          console.error("Cloud Library Delete failed", e);
      }
  }
};

// --- WORKSPACE (QUIZ HISTORY) ---
export const saveGeneratedQuiz = async (file: File | null, config: ModelConfig, questions: Question[]) => {
  let fileName = "Untitled Quiz";
  if (file) fileName = file.name;
  else if (config.topic) fileName = config.topic.split('\n')[0].substring(0, 50); 
  
  const topicSummary = questions.length > 0 ? (questions[0].keyPoint || "General") : "General";

  // Handle tags for array or single examStyle
  const styleTags = Array.isArray(config.examStyle) ? config.examStyle : [config.examStyle];

  const newEntry = {
    id: String(Date.now() + Math.floor(Math.random() * 10000)), // Safer ID as string
    fileName: fileName,
    file_name: fileName, 
    modelId: config.modelId,
    mode: config.mode,
    provider: config.provider,
    date: new Date().toISOString(),
    questionCount: questions.length,
    topicSummary: topicSummary,
    questions: questions,
    lastScore: null,
    tags: [config.mode, ...styleTags],
    folder: config.folder,
    authorId: auth.currentUser?.uid || 'local',
    title: fileName,
    isPublic: config.visibility === 'public',
    visibility: config.visibility || 'private',
    accessCode: config.accessCode,
    userId: auth.currentUser?.uid || 'local'
  };

  try {
    // 1. Save to IndexedDB (Primary)
    await update(HISTORY_IDB_KEY, (val) => {
        const history = val || [];
        const updated = [newEntry, ...history];
        return updated.slice(0, 50); // Keep only 50 most recent
    });

    // 2. Cloud Sync
    if (auth.currentUser) {
        const quizRef = doc(db, "quizzes", newEntry.id);
        await setDoc(quizRef, {
            ...newEntry,
            created_at: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }
  } catch (err) {
    console.error("Save Error:", err);
  }
};

export const getSavedQuizzes = async (): Promise<any[]> => {
  let localHistory: any[] = [];
  try {
    localHistory = await get(HISTORY_IDB_KEY);
    if (!localHistory) {
        // Migration from LocalStorage
        const rawHistory = localStorage.getItem(HISTORY_KEY);
        if (rawHistory) {
            localHistory = JSON.parse(rawHistory);
            await set(HISTORY_IDB_KEY, localHistory);
            localStorage.removeItem(HISTORY_KEY);
        } else {
            localHistory = [];
        }
    }
  } catch (e) { localHistory = []; }

  // Cloud Sync
  if (auth.currentUser) {
      try {
          const quizzesRef = collection(db, "quizzes");
          const q = query(quizzesRef, where("authorId", "==", auth.currentUser.uid));
          const querySnapshot = await getDocs(q);
          const cloudQuizzes: any[] = [];
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              cloudQuizzes.push({
                  ...data,
                  id: doc.id,
                  date: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : data.date
              });
          });

          if (cloudQuizzes.length > 0) {
              const merged = [...cloudQuizzes];
              localHistory.forEach(local => {
                  if (!merged.find(m => String(m.id) === String(local.id))) {
                      merged.push(local);
                  }
              });
              localHistory = merged;
              await set(HISTORY_IDB_KEY, localHistory);
          }
      } catch (e) {
          console.error("Cloud Quiz Fetch failed", e);
      }
  }

  return localHistory;
};

export const deleteQuiz = async (id: number | string) => {
  // 1. Local
  await update(HISTORY_IDB_KEY, (val) => {
      const history = val || [];
      return history.filter((item: any) => String(item.id) !== String(id));
  });

  // 2. Cloud
  if (auth.currentUser) {
      try {
          const quizRef = doc(db, "quizzes", String(id));
          await deleteDoc(quizRef);
      } catch (e) {
          console.error("Cloud Quiz Delete failed", e);
      }
  }
};

export const renameQuiz = async (id: number | string, newName: string) => {
  // 1. Local
  await update(HISTORY_IDB_KEY, (val) => {
      const history = val || [];
      return history.map((item: any) => 
        String(item.id) === String(id) ? { ...item, fileName: newName, file_name: newName } : item
      );
  });

  // 2. Cloud
  if (auth.currentUser) {
      try {
          const quizRef = doc(db, "quizzes", String(id));
          await updateDoc(quizRef, { 
              fileName: newName, 
              file_name: newName,
              updatedAt: serverTimestamp()
          });
      } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `quizzes/${id}`);
      }
  }
};

export const updateLocalQuizQuestions = async (id: number | string, newQuestions: Question[]) => {
  // 1. Local
  await update(HISTORY_IDB_KEY, (val) => {
      const history = val || [];
      return history.map((item: any) => 
        String(item.id) === String(id) ? { ...item, questions: newQuestions, questionCount: newQuestions.length } : item
      );
  });

  // 2. Cloud
  if (auth.currentUser) {
      try {
          const quizRef = doc(db, "quizzes", String(id));
          await updateDoc(quizRef, { 
              questions: newQuestions, 
              questionCount: newQuestions.length,
              updatedAt: serverTimestamp()
          });
      } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `quizzes/${id}`);
      }
  }
};

export const uploadQuizToCloud = async (quiz: any, visibility: string = 'private', accessCode: string = '') => {
    if (!auth.currentUser) throw new Error("Silakan login terlebih dahulu.");

    const quizId = String(quiz.id);
    const quizRef = doc(db, "quizzes", quizId);
    
    // Clean up data to match firestore.rules isValidQuiz
    const uploadData: any = {
        id: quizId,
        authorId: auth.currentUser.uid,
        userId: auth.currentUser.uid,
        title: quiz.title || quiz.fileName || "Untitled Quiz",
        questions: quiz.questions || [],
        isPublic: visibility === 'public',
        visibility: visibility,
        accessCode: accessCode,
        updatedAt: serverTimestamp(),
        created_at: quiz.date ? Timestamp.fromDate(new Date(quiz.date)) : serverTimestamp()
    };

    // Optional fields
    if (quiz.description) uploadData.description = quiz.description;
    if (quiz.fileName) uploadData.fileName = quiz.fileName;
    if (quiz.file_name) uploadData.file_name = quiz.file_name;
    if (quiz.modelId) uploadData.modelId = quiz.modelId;
    if (quiz.mode) uploadData.mode = quiz.mode;
    if (quiz.provider) uploadData.provider = quiz.provider;
    if (quiz.date) uploadData.date = quiz.date;
    if (quiz.questionCount) uploadData.questionCount = quiz.questionCount;
    if (quiz.topicSummary) uploadData.topicSummary = quiz.topicSummary;
    if (quiz.lastScore !== undefined) uploadData.lastScore = quiz.lastScore;
    if (quiz.lastPlayed) uploadData.lastPlayed = quiz.lastPlayed;
    if (quiz.tags) uploadData.tags = quiz.tags;
    if (quiz.folder) uploadData.folder = quiz.folder;

    try {
        await setDoc(quizRef, uploadData, { merge: true });
        return true;
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `quizzes/${quizId}`);
    }
};

export const downloadQuizFromCloud = async (quiz: any) => {
    try {
        // 1. Save to IndexedDB (Primary)
        await update(HISTORY_IDB_KEY, (val) => {
            const history = val || [];
            // Check if already exists
            if (history.find((h: any) => String(h.id) === String(quiz.id))) {
                return history;
            }
            const updated = [{ ...quiz, authorId: auth.currentUser?.uid || 'local', userId: auth.currentUser?.uid || 'local' }, ...history];
            return updated.slice(0, 50);
        });
        return true;
    } catch (err) {
        console.error("Download Error:", err);
        throw err;
    }
};

export const getCloudQuizzes = async (filter: 'public' | 'mine' = 'public'): Promise<any[]> => {
    try {
        const quizzesRef = collection(db, "quizzes");
        let q;
        if (filter === 'mine') {
            if (!auth.currentUser) return [];
            q = query(quizzesRef, where("authorId", "==", auth.currentUser.uid), limit(50));
        } else {
            q = query(quizzesRef, where("isPublic", "==", true), limit(50));
        }
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data() as any;
            return {
                ...data,
                id: doc.id,
                isCloud: true,
                date: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : data.date
            };
        });
    } catch (err) {
        handleFirestoreError(err, OperationType.LIST, "quizzes");
        return [];
    }
};

export const searchCloudQuiz = async (code: string) => {
    try {
        // Search by ID or accessCode
        const quizzesRef = collection(db, "quizzes");
        
        // Try searching by ID first
        const docRef = doc(db, "quizzes", code);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isPublic === true || (data.visibility === 'unlisted' && data.accessCode === code) || data.authorId === auth.currentUser?.uid) {
                return { ...data, id: docSnap.id };
            }
        }

        // Try searching by accessCode for unlisted
        const q = query(quizzesRef, where("accessCode", "==", code), where("visibility", "==", "unlisted"));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { ...doc.data(), id: doc.id };
        }

        // Try searching by public visibility if code matches title/topic (basic search)
        const qPublic = query(quizzesRef, where("isPublic", "==", true));
        const publicSnapshot = await getDocs(qPublic);
        const found = publicSnapshot.docs.find(d => {
            const data = d.data();
            return (data.title?.toLowerCase().includes(code.toLowerCase()) || 
                    data.fileName?.toLowerCase().includes(code.toLowerCase()) || 
                    d.id === code);
        });
        if (found) return { ...found.data(), id: found.id };

        throw new Error("Kuis tidak ditemukan atau akses ditolak.");
    } catch (err) {
        handleFirestoreError(err, OperationType.LIST, "quizzes");
    }
};

export const createMultiplayerRoom = async (quiz: any, hostName: string) => {
    if (!auth.currentUser) throw new Error("Login required");
    
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const roomId = generateId();
    const roomRef = doc(db, "rooms", roomId);
    
    const roomData = {
        id: roomId,
        code: roomCode,
        hostId: auth.currentUser.uid,
        hostName: hostName,
        quizId: String(quiz.id),
        quizData: quiz.questions,
        status: 'waiting',
        currentQuestionIndex: 0,
        createdAt: serverTimestamp(),
        players: [
            { id: auth.currentUser.uid, name: hostName, isHost: true, joinedAt: Date.now() }
        ]
    };
    
    try {
        await setDoc(roomRef, roomData);
        return { roomId, roomCode };
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `rooms/${roomId}`);
    }
};

export const joinMultiplayerRoom = async (roomCode: string, playerName: string) => {
    try {
        const roomsRef = collection(db, "rooms");
        const q = query(roomsRef, where("code", "==", roomCode.toUpperCase()), where("status", "==", "waiting"));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) throw new Error("Ruangan tidak ditemukan atau sudah dimulai.");
        
        const roomDoc = querySnapshot.docs[0];
        const roomId = roomDoc.id;
        const roomData = roomDoc.data();
        
        const playerId = generateId();
        const newPlayer = { id: playerId, name: playerName, isHost: false, joinedAt: Date.now() };
        
        const updatedPlayers = [...(roomData.players || []), newPlayer];
        await updateDoc(doc(db, "rooms", roomId), { players: updatedPlayers });
        
        return { roomId, playerId, quizData: roomData.quizData };
    } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, "rooms");
    }
};

export const updateHistoryStats = async (id: number | string, score: number) => {
  // 1. Local
  await update(HISTORY_IDB_KEY, (val) => {
      const history = val || [];
      return history.map((item: any) => 
        String(item.id) === String(id) ? { ...item, lastScore: score, lastPlayed: new Date().toISOString() } : item
      );
  });

  // 2. Cloud
  if (auth.currentUser) {
      try {
          const quizRef = doc(db, "quizzes", String(id));
          await updateDoc(quizRef, { 
              lastScore: score, 
              lastPlayed: serverTimestamp(),
              updatedAt: serverTimestamp()
          });
      } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `quizzes/${id}`);
      }
  }
};
