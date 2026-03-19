import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";

// Konfigurasi dari proyek Notes Anda (gen-lang-client-0781879333)
// Anda harus mengisi nilai-nilai ini di AI Studio Settings -> Secrets
const firebaseConfig = {
  apiKey: import.meta.env.VITE_EXTERNAL_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_EXTERNAL_FIREBASE_AUTH_DOMAIN,
  projectId: "gen-lang-client-0781879333", // Sesuai petunjuk Gemini
  storageBucket: import.meta.env.VITE_EXTERNAL_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_EXTERNAL_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_EXTERNAL_FIREBASE_APP_ID
};

// Cek apakah konfigurasi sudah lengkap (terutama API Key)
export const isExternalConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY');

// Pastikan kita hanya menginisialisasi app satu kali (mencegah error hot-reload)
const appName = "ExternalNotesApp";

let app: any;
let externalDb: any;
let externalAuth: any;

if (isExternalConfigured) {
  try {
    app = getApps().find(a => a.name === appName) || initializeApp(firebaseConfig, appName);
    // Dapatkan instance Firestore untuk database spesifik 'ai-studio-51e5485b-8ae2-4d2d-afb9-e5ab30554ff4'
    externalDb = getFirestore(app, 'ai-studio-51e5485b-8ae2-4d2d-afb9-e5ab30554ff4');
    externalAuth = getAuth(app);
  } catch (error) {
    console.error("Gagal inisialisasi Firebase Eksternal:", error);
  }
}

export { externalDb, externalAuth };

// --- FUNGSI AUTENTIKASI ---
export const loginToExternalNotes = async () => {
  if (!isExternalConfigured) {
    throw new Error("Konfigurasi Firebase Eksternal belum lengkap. Silakan isi API Key di Settings.");
  }
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(externalAuth, provider);
    return result.user;
  } catch (error) {
    console.error("Gagal login ke aplikasi Notes:", error);
    throw error;
  }
};

export const logoutFromExternalNotes = async () => {
  try {
    await signOut(externalAuth);
  } catch (error) {
    console.error("Gagal logout dari aplikasi Notes:", error);
  }
};

// --- FUNGSI MENGAMBIL CATATAN ---
export interface ExternalNote {
  id: string;
  title?: string; // Sesuaikan dengan struktur data Anda
  content?: string; // Sesuaikan dengan struktur data Anda
  text?: string; // Sesuaikan dengan struktur data Anda
  userId: string;
  [key: string]: any;
}

export const getMyNotes = async (): Promise<ExternalNote[]> => {
  const user = externalAuth.currentUser;

  if (!user) {
    throw new Error("Anda harus login ke aplikasi Notes terlebih dahulu.");
  }

  try {
    const userId = user.uid;
    // Buat query untuk mengambil catatan di mana 'userId' cocok dengan UID pengguna yang sedang login
    const q = query(collection(externalDb, "notes"), where("userId", "==", userId));

    const querySnapshot = await getDocs(q);
    const notes: ExternalNote[] = [];
    
    querySnapshot.forEach((doc) => {
      notes.push({ id: doc.id, ...doc.data() } as ExternalNote);
    });
    
    return notes;
  } catch (error) {
    console.error("Gagal mengambil catatan:", error);
    throw error;
  }
};
