import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, deleteDoc, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { JournalEntry, UserProfile } from '../types';

const getUserId = () => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  return auth.currentUser.uid;
};

// --- Journal Entries ---

export const saveEntry = async (entry: JournalEntry): Promise<void> => {
  const uid = getUserId();
  const entryRef = doc(db, `users/${uid}/journal_entries`, entry.id);
  await setDoc(entryRef, entry);
  
  // Also update the profile with new facts
  await updateUserProfile(entry.metadata.extractedFacts);
};

export const getEntries = async (): Promise<JournalEntry[]> => {
  if (!auth.currentUser) return [];
  const uid = getUserId();
  const q = query(collection(db, `users/${uid}/journal_entries`), orderBy('timestamp', 'desc'));
  
  try {
    const querySnapshot = await getDocs(q);
    // Explicitly typing 'doc' to appease strict TS checks in build pipeline
    return querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData, DocumentData>) => doc.data() as JournalEntry);
  } catch (e) {
    console.error("Failed to fetch entries", e);
    return [];
  }
};

// --- User Profile (Core Memory) ---

export const getUserProfile = async (): Promise<UserProfile> => {
  if (!auth.currentUser) return { coreMemories: [], lastUpdated: Date.now() };
  const uid = getUserId();
  const docRef = doc(db, `users/${uid}/profile`, 'core');
  
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return { coreMemories: [], lastUpdated: Date.now() };
  } catch (e) {
    return { coreMemories: [], lastUpdated: Date.now() };
  }
};

export const updateUserProfile = async (newFacts: string[]): Promise<void> => {
  if (!newFacts || newFacts.length === 0) return;
  const uid = getUserId();
  
  const currentProfile = await getUserProfile();
  // Merge new facts, remove duplicates
  const merged = Array.from(new Set([...currentProfile.coreMemories, ...newFacts]));
  
  const updatedProfile: UserProfile = {
    coreMemories: merged,
    lastUpdated: Date.now()
  };
  
  const docRef = doc(db, `users/${uid}/profile`, 'core');
  await setDoc(docRef, updatedProfile);
};

export const clearHistory = async (): Promise<void> => {
  const uid = getUserId();
  // In a real app we would use batch delete, for now this is a hard reset
  // Firestore doesn't support deleting collections easily from client
  console.warn("Full clear not fully implemented for client-side safety. Please manually delete subcollections.");
};

export const getContextualLocation = (hour: number): string => {
  if (hour >= 9 && hour <= 17) return "Office / Work";
  if (hour > 22 || hour < 7) return "Home";
  return "Outdoors / Transit";
};

// --- Data Management (Legacy/Migration) ---
// Note: Direct JSON import/export is harder with Firestore async nature and potential size.
// For now, we disabled the sync implementation.

export const exportData = async (): Promise<string> => {
  const entries = await getEntries();
  const profile = await getUserProfile();
  return JSON.stringify({ entries, profile, exportedAt: Date.now() }, null, 2);
};