import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

export const useMultiplayerSync = (setCurrentIndex: (index: number) => void) => {
  const { isMultiplayer, multiplayerRoomId: roomId } = useAppStore();
  const [multiplayerScores, setMultiplayerScores] = useState<any[]>([]);

  // Fetch and subscribe to multiplayer scores (players)
  useEffect(() => {
    if (!isMultiplayer || !roomId) return;

    const path = `rooms/${roomId}/players`;
    const playersRef = collection(db, "rooms", roomId, "players");
    const q = query(playersRef, orderBy("score", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scores: any[] = [];
      snapshot.forEach((doc) => {
        scores.push({ ...doc.data(), id: doc.id });
      });
      setMultiplayerScores(scores);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [isMultiplayer, roomId]);

  // Subscribe to Room Status (Question Index)
  useEffect(() => {
    if (!isMultiplayer || !roomId) return;

    const path = `rooms/${roomId}`;
    const roomRef = doc(db, "rooms", roomId);

    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.currentQuestionIndex !== undefined) {
          setCurrentIndex(data.currentQuestionIndex);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [isMultiplayer, roomId, setCurrentIndex]);

  return { multiplayerScores };
};
