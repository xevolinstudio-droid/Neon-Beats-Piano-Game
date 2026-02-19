import { initializeApp } from 'firebase/app';
// Workaround for firebase/auth import errors: Cast module to any to bypass "has no exported member" TS errors.
// This ensures the code compiles even if the environment has mismatched firebase type definitions.
import * as _auth from 'firebase/auth';
const authModule = _auth as any;

const { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} = authModule;

// Manually define User interface as it is missing from exports in this environment
export interface User {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
}

// Mock Auth type
export type Auth = any;

import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

// --------------------------------------------------------
// FIREBASE CONFIGURATION
// --------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCSXMoWFj6Or_U6xajKL4V_1dIGS_6wQGo",
  authDomain: "neon-beats-piano-game.firebaseapp.com",
  projectId: "neon-beats-piano-game",
  storageBucket: "neon-beats-piano-game.firebasestorage.app",
  messagingSenderId: "537966671999",
  appId: "1:537966671999:web:52bbf5943ea0d647d1674a",
  measurementId: "G-QYVXMXS7BV"
};

// Initialize variables
let app;
let auth: Auth | null = null;
let db: Firestore | null = null;
let isConfigured = false;

// Attempt to initialize
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  isConfigured = true;
  console.log("Firebase initialized successfully (Modular)");
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

// Re-export Auth functions and variables
export { auth, db, isConfigured, onAuthStateChanged };

/**
 * Initiates Google Sign-In Popup
 */
export const loginWithGoogle = async () => {
  if (!isConfigured || !auth) throw new Error("Firebase configuration missing.");

  // Protocol Check
  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
      console.error("Auth Error: Invalid Protocol " + window.location.protocol);
      alert(`Google Sign-In requires the app to be served over HTTP or HTTPS. Current protocol (${window.location.protocol}) is not supported.`);
      return;
  }

  const provider = new GoogleAuthProvider();
  
  // Configure with the specific Client ID
  provider.setCustomParameters({
    client_id: '933618976126-qcevf14hauofchpv9eknc37208vki46q.apps.googleusercontent.com'
  });

  try {
    // Force local persistence to ensure token is stored
    await setPersistence(auth, browserLocalPersistence);
    
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Login failed:", error);
    
    // Handle specific environment errors
    if (error.code === 'auth/operation-not-supported-in-this-environment') {
        alert("Login is not supported in this environment. Please ensure you are running on HTTPS and cookies/storage are enabled. If you are in a private window or embedded preview, try opening in a normal browser tab.");
    } else if (error.code === 'auth/popup-blocked') {
        alert("Popup was blocked. Please allow popups for this site.");
    } else {
        alert(`Login Failed: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Signs out the current user
 */
export const logoutUser = async () => {
  if (!auth) return;
  await signOut(auth);
};

/**
 * Fetches the user's high score from Firestore
 */
export const getUserHighScore = async (uid: string): Promise<number> => {
    if (!db) return 0;
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().highScore || 0;
        }
    } catch (e) {
        console.error("Error fetching score:", e);
    }
    return 0;
};

/**
 * Saves the user's high score to Firestore
 * Only updates if the new score is higher
 */
export const saveUserHighScore = async (user: User, score: number) => {
    if (!db || !user) return;
    try {
        const userRef = doc(db, "users", user.uid);
        
        // Check current cloud score first to avoid overwriting with lower
        const currentScore = await getUserHighScore(user.uid);
        if (score > currentScore) {
            await setDoc(userRef, {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                highScore: score,
                lastPlayed: new Date().toISOString()
            }, { merge: true });
            console.log("High score saved to cloud:", score);
        }
    } catch (e) {
        console.error("Error saving score:", e);
    }
};