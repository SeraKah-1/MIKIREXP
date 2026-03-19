
/**
 * ==========================================
 * CHALLENGE SERVICE (Async Multiplayer)
 * Handles creating and fetching challenge data.
 * ==========================================
 */

import { ChallengeData, Question } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { generateId } from "./storageService";

export const createChallenge = async (
  creatorName: string,
  topic: string,
  questions: Question[],
  creatorScore: number
): Promise<string> => {
  const challengeId = generateId();
  const path = `challenges/${challengeId}`;
  
  try {
    const challengeData = {
      id: challengeId,
      creatorName,
      topic,
      questions,
      creatorScore,
      created_at: serverTimestamp()
    };
    
    await setDoc(doc(db, "challenges", challengeId), challengeData);
    return challengeId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return "";
  }
};

export const getChallenge = async (challengeId: string): Promise<ChallengeData | null> => {
  const path = `challenges/${challengeId}`;
  try {
    const docRef = doc(db, "challenges", challengeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        created_at: data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : data.created_at
      } as ChallengeData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const submitChallengeAttempt = async (
  challengeId: string,
  challengerName: string,
  score: number
) => {
  const path = `challenges/${challengeId}`;
  try {
    const docRef = doc(db, "challenges", challengeId);
    await updateDoc(docRef, {
      challengerName,
      challengerScore: score
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};
