import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let app: FirebaseApp | undefined;
let auth: Auth;
let db: Firestore;
let googleProvider: GoogleAuthProvider;

try {
  // Simple validation to avoid white screen of death if env vars are missing
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } else {
    console.error("Firebase Configuration Missing! Check your .env file or Vite config.");
  }
} catch (e) {
  console.error("Firebase Initialization Failed:", e);
}

export { auth, db, googleProvider };

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase not initialized");
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Error signing in", error);
    throw error;
  }
};

export const logoutUser = async () => {
  if (!auth) return;
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};