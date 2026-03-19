
import { SRSItem } from "../types";
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
    orderBy
} from "firebase/firestore";

/**
 * NEURO-SYNC (SRS) SERVICE
 * Mengelola algoritma Spaced Repetition (SM-2 Modified)
 */

export const NeuroSync = {
  
  /**
   * Hitung jadwal review berikutnya menggunakan algoritma SM-2
   * @param item Item SRS saat ini
   * @param rating 0 (Again), 1 (Hard), 2 (Good), 3 (Easy)
   */
  calculateNextReview(item: SRSItem, rating: number): SRSItem {
    let { easiness, interval, repetition } = item;
    
    // Rating: 0 (Again), 1 (Hard), 2 (Good), 3 (Easy)
    
    // Update Easiness Factor (SM-2 formula based on 0-5 scale)
    // Map our 0-3 to SM-2's 0-5: 0->0, 1->3, 2->4, 3->5
    const q = rating === 0 ? 0 : rating === 1 ? 3 : rating === 2 ? 4 : 5;
    easiness = easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (easiness < 1.3) easiness = 1.3;

    let nextIntervalMinutes = 0;

    if (rating === 0) {
      // Again: Reset repetition, review in 1 minute
      repetition = 0;
      interval = 0;
      nextIntervalMinutes = 1;
    } else if (rating === 1) {
      // Hard
      if (repetition === 0) {
        nextIntervalMinutes = 10; // 10 minutes for new cards
      } else {
        interval = Math.max(1, Math.round(interval * 1.2)); // 20% increase
        nextIntervalMinutes = interval * 24 * 60;
      }
    } else if (rating === 2) {
      // Good
      if (repetition === 0) {
        interval = 1;
      } else if (repetition === 1) {
        interval = 3; // Reduced from 6 to prevent too long gap
      } else {
        interval = Math.round(interval * easiness);
      }
      repetition++;
      nextIntervalMinutes = interval * 24 * 60;
    } else if (rating === 3) {
      // Easy
      if (repetition === 0) {
        interval = 4; // 4 days for easy new cards
      } else {
        interval = Math.round(interval * easiness * 1.3); // Bonus for easy
      }
      repetition++;
      nextIntervalMinutes = interval * 24 * 60;
    }

    // Add fuzzing (randomness) to prevent stacking cards reviewed at the same time
    // Fuzzing: +/- 5% of the interval, minimum 1 minute
    if (nextIntervalMinutes > 60) { // Only fuzz if interval > 1 hour
      const fuzzFactor = 0.05;
      const fuzzRange = nextIntervalMinutes * fuzzFactor;
      const fuzz = (Math.random() * fuzzRange * 2) - fuzzRange;
      nextIntervalMinutes += fuzz;
    }

    const nextReview = new Date();
    nextReview.setMinutes(nextReview.getMinutes() + nextIntervalMinutes);

    return {
      ...item,
      easiness,
      interval,
      repetition,
      next_review: nextReview.toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  /**
   * Tambahkan item baru ke antrean SRS
   */
  async addItem(config: any, keycardId: string, item: Partial<SRSItem>) {
    if (!auth.currentUser) return false;

    const id = item.id || (Date.now() + Math.random().toString(36).substr(2));
    const newItem: SRSItem = {
      id,
      keycard_id: keycardId,
      item_id: item.item_id!,
      item_type: item.item_type!,
      content: item.content,
      easiness: 2.5,
      interval: 0,
      repetition: 0,
      next_review: new Date().toISOString(),
      ...item
    };

    try {
      const srsRef = doc(db, "users", auth.currentUser.uid, "srs", id);
      await setDoc(srsRef, {
          ...newItem,
          userId: auth.currentUser.uid,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          dueDate: Timestamp.fromDate(new Date(newItem.next_review))
      });
      return true;
    } catch (e) {
      console.error("Failed to add SRS item:", e);
      return false;
    }
  },

  /**
   * Ambil semua item yang siap di-review hari ini
   */
  async getDueItems(config: any, keycardId: string): Promise<SRSItem[]> {
    if (!auth.currentUser) return [];

    try {
      const srsRef = collection(db, "users", auth.currentUser.uid, "srs");
      let q;
      if (keycardId && keycardId !== "global") {
        q = query(
            srsRef, 
            where("keycard_id", "==", keycardId),
            where("dueDate", "<=", Timestamp.now()),
            orderBy("dueDate", "asc")
        );
      } else {
        q = query(
            srsRef, 
            where("dueDate", "<=", Timestamp.now()),
            orderBy("dueDate", "asc")
        );
      }
      const querySnapshot = await getDocs(q);
      const items: SRSItem[] = [];
      querySnapshot.forEach((doc) => {
          const data = doc.data() as any;
          items.push({
              ...data,
              id: doc.id,
              next_review: data.dueDate instanceof Timestamp ? data.dueDate.toDate().toISOString() : data.next_review
          } as SRSItem);
      });
      return items;
    } catch (e) {
      console.error("Failed to fetch due items:", e);
      return [];
    }
  },

  /**
   * Ambil statistik SRS
   */
  async getStats(config: any, keycardId: string): Promise<{ total: number, due: number, learned: number }> {
    if (!auth.currentUser) return { total: 0, due: 0, learned: 0 };

    try {
      const srsRef = collection(db, "users", auth.currentUser.uid, "srs");
      let q;
      if (keycardId && keycardId !== "global") {
        q = query(srsRef, where("keycard_id", "==", keycardId));
      } else {
        q = query(srsRef);
      }
      const querySnapshot = await getDocs(q);
      
      let total = 0;
      let due = 0;
      let learned = 0;
      const now = new Date();

      querySnapshot.forEach((doc) => {
          total++;
          const data = doc.data() as any;
          const dueDate = data.dueDate instanceof Timestamp ? data.dueDate.toDate() : new Date(data.next_review);
          if (dueDate <= now) {
            due++;
          }
          if (data.interval > 21) {
            learned++;
          }
      });
      return { total, due, learned };
    } catch (e) {
      console.error("Failed to fetch SRS stats:", e);
      return { total: 0, due: 0, learned: 0 };
    }
  },

  /**
   * Update item setelah di-review
   */
  async processReview(config: any, item: SRSItem, rating: number) {
    if (!auth.currentUser || !item.id) return null;

    const updatedItem = this.calculateNextReview(item, rating);
    try {
      const srsRef = doc(db, "users", auth.currentUser.uid, "srs", item.id);
      await updateDoc(srsRef, {
          easiness: updatedItem.easiness,
          interval: updatedItem.interval,
          repetition: updatedItem.repetition,
          next_review: updatedItem.next_review,
          updated_at: serverTimestamp(),
          dueDate: Timestamp.fromDate(new Date(updatedItem.next_review))
      });
      return updatedItem;
    } catch (e) {
      console.error("Failed to update SRS item:", e);
      return null;
    }
  }
};

/**
 * LEGACY: Create a retention sequence by repeating some questions
 * @param questions Original questions
 * @param ratio Ratio of questions to repeat (0.6 = 60% more)
 */
export const createRetentionSequence = (questions: any[], ratio: number = 0.6): any[] => {
  if (!questions || questions.length === 0) return [];
  
  const repeatCount = Math.ceil(questions.length * ratio);
  const toRepeat = [...questions]
    .sort(() => Math.random() - 0.5)
    .slice(0, repeatCount)
    .map(q => ({ ...q, isReview: true, id: q.id + 1000 })); // Unique ID for review questions

  const combined = [...questions, ...toRepeat];
  return combined.sort(() => Math.random() - 0.5);
};

// --- COMPATIBILITY WRAPPERS ---

export const getDueItems = async (config?: any, keycardId?: string) => {
  return NeuroSync.getDueItems(config, keycardId || "");
};

export const processCardReview = async (config?: any, item?: SRSItem, rating?: number) => {
  if (!item || rating === undefined) return null;
  return NeuroSync.processReview(config, item, rating);
};

export const addQuestionToSRS = async (config?: any, keycardId?: string, question?: any) => {
  if (!question) return false;
  return NeuroSync.addItem(config, keycardId || "", {
    item_id: String(question.id),
    item_type: 'quiz_question',
    content: question
  });
};
