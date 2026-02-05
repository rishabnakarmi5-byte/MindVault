import { JournalEntry, UserProfile } from '../types';

const ENTRY_KEY = 'mindvault_entries_v1';
const PROFILE_KEY = 'mindvault_profile_v1';

// --- Journal Entries ---

export const saveEntry = (entry: JournalEntry): void => {
  const existing = getEntries();
  const updated = [entry, ...existing];
  // Limit to last 100 entries to prevent LocalStorage quota issues in this demo
  // In a real production app, this would use IndexedDB
  if (updated.length > 100) updated.length = 100;
  localStorage.setItem(ENTRY_KEY, JSON.stringify(updated));
  
  // Also update the profile with new facts
  updateUserProfile(entry.metadata.extractedFacts);
};

export const getEntries = (): JournalEntry[] => {
  const data = localStorage.getItem(ENTRY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse journal entries", e);
    return [];
  }
};

// --- User Profile (Core Memory) ---

export const getUserProfile = (): UserProfile => {
  const data = localStorage.getItem(PROFILE_KEY);
  if (!data) return { coreMemories: [], lastUpdated: Date.now() };
  try {
    return JSON.parse(data);
  } catch (e) {
    return { coreMemories: [], lastUpdated: Date.now() };
  }
};

export const updateUserProfile = (newFacts: string[]): void => {
  if (!newFacts || newFacts.length === 0) return;
  
  const profile = getUserProfile();
  // Merge new facts, remove duplicates
  const merged = Array.from(new Set([...profile.coreMemories, ...newFacts]));
  
  const updatedProfile: UserProfile = {
    coreMemories: merged,
    lastUpdated: Date.now()
  };
  
  localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
};

export const clearHistory = (): void => {
  localStorage.removeItem(ENTRY_KEY);
  localStorage.removeItem(PROFILE_KEY);
};

export const getContextualLocation = (hour: number): string => {
  if (hour >= 9 && hour <= 17) return "Office / Work";
  if (hour > 22 || hour < 7) return "Home";
  return "Outdoors / Transit";
};

// --- Data Management ---

export const exportData = (): string => {
  const entries = getEntries();
  const profile = getUserProfile();
  return JSON.stringify({ entries, profile, exportedAt: Date.now() }, null, 2);
};

export const importData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (data.entries && Array.isArray(data.entries)) {
      localStorage.setItem(ENTRY_KEY, JSON.stringify(data.entries));
    }
    if (data.profile) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
    }
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};