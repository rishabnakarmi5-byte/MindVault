export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PsychMetrics {
  // Russell, J. A. (1980). A circumplex model of affect.
  valence: number; // -1.0 (Unpleasant) to 1.0 (Pleasant)
  arousal: number; // 0.0 (Deactivated) to 1.0 (Activated)
  
  // Beck, A. T. (1976). Cognitive Therapy and the Emotional Disorders.
  cbtDistortions: string[]; // e.g., "Catastrophizing", "Filtering"
  
  // Maslow, A. H. (1943). A theory of human motivation.
  maslowLevel: 'Physiological' | 'Safety' | 'Belonging' | 'Esteem' | 'Self-Actualization';
}

export interface ProcessedMetadata {
  transcript: string;
  summary: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Anxious' | 'Excited' | 'Stressed';
  tags: string[];
  keyEvents: string[];
  extractedFacts: string[];
  psychometrics: PsychMetrics;
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  dateStr: string;
  locationName: string;
  coordinates?: Coordinates;
  metadata: ProcessedMetadata;
}

export interface UserProfile {
  coreMemories: string[]; 
  lastUpdated: number;
}

export interface AnalysisResponse {
  answer: string;
  relevantEntryIds: string[];
}